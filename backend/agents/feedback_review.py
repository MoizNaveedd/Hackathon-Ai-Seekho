"""Agent 7 - Feedback / Review (background): collects and stores post-service feedback."""

import json
import time
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider, Booking, Notification
from database import SessionLocal
from .llm import _call_llm, log


class FeedbackReviewAgent:
    """Runs after a user completes a booking and leaves a rating/comment.

    1. Judges the comment's tone via the LLM (sentiment in [-1, 1]).
    2. Derives a sentiment-adjusted "effective" rating from the raw star + tone.
    3. Recomputes the provider's overall rating as the average of effective
       scores across all completed, rated bookings (idempotent / self-healing).
    4. Notifies the provider of the new review and updated average.

    Follows the ChatSummarizerAgent pattern: opens its own DB session, never
    raises (so it can run fire-and-forget in a background thread).
    """

    # How hard the comment's tone is allowed to move the star rating.
    NEG_NUDGE = 1.0   # a negative comment can pull a rating down by up to 1.0
    POS_NUDGE = 0.5   # a positive comment can lift a rating by up to 0.5

    def __init__(self):
        self.name = "Feedback / Review Agent"

    def _analyze_sentiment(self, comment: str) -> dict:
        """Return {sentiment: float[-1,1], label: str, summary: str}. Safe defaults on failure."""
        if not comment or not comment.strip():
            return {"sentiment": 0.0, "label": "neutral", "summary": ""}

        system_instruction = """
You analyze a customer's review comment for a home-service booking on Karigar AI.
Judge ONLY the tone of the comment. Comments may be in English, Roman Urdu, or Urdu.

Return ONLY a JSON object:
{
  "sentiment": <float between -1.0 (very negative) and 1.0 (very positive), 0.0 = neutral>,
  "label": "positive" | "neutral" | "negative",
  "summary": "A neutral one-line summary of the feedback in English (max 15 words)."
}
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"Review comment: \"{comment.strip()}\"",
                json_mode=True,
                max_tokens=200,
                temperature=0.0,
                agent=self.name,
            )
            result = json.loads(response_text)
            sentiment = float(result.get("sentiment", 0.0))
            sentiment = max(-1.0, min(1.0, sentiment))  # clamp
            return {
                "sentiment": sentiment,
                "label": result.get("label", "neutral"),
                "summary": (result.get("summary") or "").strip(),
            }
        except Exception as e:
            log.warning(f"FeedbackReview: sentiment analysis failed ({str(e)[:80]}), treating as neutral.")
            return {"sentiment": 0.0, "label": "neutral", "summary": ""}

    def _compute_effective_rating(self, star: float, comment: str, sentiment: float) -> float:
        """Blend the raw star with the comment's tone.

        - Star + comment: nudge the star by the tone (bad pulls harder than good lifts).
        - Star only:      use the star as-is.
        - Comment only:   derive a rating from tone, centred on 3.
        """
        has_comment = bool(comment and comment.strip())

        if star is not None and has_comment:
            nudge = sentiment * (self.NEG_NUDGE if sentiment < 0 else self.POS_NUDGE)
            effective = star + nudge
        elif star is not None:
            effective = star
        else:  # comment only
            effective = 3.0 + sentiment * 2.0

        return round(max(1.0, min(5.0, effective)), 1)

    def _recompute_provider_rating(self, provider: Provider, db: Session) -> float:
        """Average effective scores (falling back to raw star) over completed, rated bookings."""
        rated = (
            db.query(Booking)
            .filter(
                Booking.provider_id == provider.id,
                Booking.status == "Completed",
            )
            .all()
        )
        scores = []
        for b in rated:
            score = b.effective_rating if b.effective_rating is not None else b.customer_rating
            if score is not None:
                scores.append(score)

        if not scores:
            return provider.rating

        new_rating = round(sum(scores) / len(scores), 1)
        provider.rating = new_rating
        return new_rating

    def _notify_provider(self, provider: Provider, booking: Booking, new_rating: float,
                         star: float, summary: str, db: Session):
        """Record + push a notification to the provider about the new review."""
        star_txt = f"{star:g}⭐ " if star is not None else ""
        detail = f' — "{summary}"' if summary else ""
        title = "New Review Received"
        body = (
            f"You received a {star_txt}review on your {booking.service_type or 'service'} booking "
            f"(#{booking.id}){detail}. Your overall rating is now {new_rating}/5."
        )
        try:
            notification = Notification(
                title=title,
                message=body,
                type="review_received",
                is_read=False,
                created_at=datetime.now().isoformat(),
                user_id=booking.user_id,
                provider_id=provider.id,
                booking_id=booking.id,
            )
            db.add(notification)
            db.commit()
        except Exception as e:
            log.error(f"FeedbackReview: notification record failed ({str(e)[:80]})")
            db.rollback()

        if provider.device_token:
            try:
                # Lazy import to avoid a circular import at module load time.
                from bookings_notifications import trigger_push_notification
                trigger_push_notification(
                    device_token=provider.device_token,
                    title=title,
                    message=body,
                    data={"booking_id": str(booking.id), "type": "review_received",
                          "new_rating": str(new_rating)},
                )
            except Exception as e:
                log.error(f"FeedbackReview: push dispatch failed ({str(e)[:80]})")

    def process(self, booking_id: int):
        """Entry point — safe to call in a background thread. Opens its own DB session."""
        db = SessionLocal()
        try:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                log.error(f"FeedbackReview: Booking {booking_id} not found.")
                return

            star = booking.customer_rating
            comment = booking.customer_feedback
            if star is None and not (comment and comment.strip()):
                log.info(f"FeedbackReview: Booking {booking_id} has no rating or comment, skipping.")
                return

            sentiment_data = self._analyze_sentiment(comment)
            effective = self._compute_effective_rating(star, comment, sentiment_data["sentiment"])
            booking.effective_rating = effective
            db.commit()

            provider = db.query(Provider).filter(Provider.id == booking.provider_id).first()
            if not provider:
                log.error(f"FeedbackReview: Provider {booking.provider_id} not found.")
                return

            new_rating = self._recompute_provider_rating(provider, db)
            db.commit()

            log.info(
                f"FeedbackReview: Booking {booking_id} | star={star} "
                f"sentiment={sentiment_data['sentiment']:+.2f} ({sentiment_data['label']}) "
                f"-> effective={effective} | Provider {provider.id} rating -> {new_rating}"
            )

            self._notify_provider(provider, booking, new_rating, star,
                                  sentiment_data.get("summary", ""), db)
        except Exception as e:
            log.error(f"FeedbackReviewAgent failed: {e}")
            db.rollback()
        finally:
            db.close()
