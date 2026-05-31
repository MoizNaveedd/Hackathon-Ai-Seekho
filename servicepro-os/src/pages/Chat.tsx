import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const passedName = (location.state as { customerName?: string } | null)?.customerName;

  return (
    <div className="h-full w-full animate-in fade-in duration-500">
      <ChatPanel customerName={passedName || "Customer"} bookingId={id} onBack={() => navigate(-1)} />
    </div>
  );
}
