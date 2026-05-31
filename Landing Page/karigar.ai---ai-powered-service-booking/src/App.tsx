/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Globe2,
  Timer,
  Users,
  Star,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  PlayCircle,
  Menu,
  X,
  Wrench,
  Droplets,
  Wind,
  Sparkles,
  Car,
  UserCircle2,
  BookOpen,
  Hammer,
  Truck,
  Camera,
  Scissors,
  SquarePlus,
  Lock,
  Bug,
  Paintbrush,
  Plug,
  Linkedin,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useRef, createContext, useContext } from "react";

// --- App download config ---

const ANDROID_APP_URL =
  "https://drive.google.com/drive/folders/1dREQwCcq5UkOpEqi39oXIQv__LvM04Uk?usp=drive_link";

const openAndroidApp = () =>
  window.open(ANDROID_APP_URL, "_blank", "noopener,noreferrer");

// Lets any button anywhere trigger the shared "iOS coming soon" modal.
const IosSoonContext = createContext<() => void>(() => {});
const useIosSoon = () => useContext(IosSoonContext);

// --- Components ---

const AppleLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);


const Logo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <img
      src="/logo.png"
      alt="Karigar.ai Logo"
      className="w-full h-full object-contain"
    />
  </div>
);

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "How it works", href: "#how-it-works" },
    { name: "Services", href: "#services" },
    { name: "Features", href: "#features" },
    { name: "Team", href: "#team" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass py-3 shadow-sm" : "bg-transparent py-5"}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <Logo size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tight">Karigar.ai</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors"
            >
              {link.name}
            </a>
          ))}
          <button
            onClick={openAndroidApp}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-primary transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
          >
            Download App
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-slate-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 md:hidden shadow-xl"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-600 border-b border-slate-50 pb-2"
              >
                {link.name}
              </a>
            ))}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAndroidApp();
              }}
              className="bg-brand-primary text-white w-full py-4 rounded-2xl font-bold mt-2 shadow-lg shadow-brand-primary/20"
            >
              Download Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const showIosSoon = useIosSoon();

  const words = [
    "Plumber chahiye?",
    "Need AC Repair?",
    "Sink leak ho raha hai.",
    "Car wash at 5pm?",
    "Ghar ki safai karwani hai."
  ];

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % words.length;
      const fullText = words[i];

      setDisplayText(isDeleting
        ? fullText.substring(0, displayText.length - 1)
        : fullText.substring(0, displayText.length + 1)
      );

      setTypingSpeed(isDeleting ? 30 : 100);

      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed]);

  return (
    <section className="relative pt-32 pb-20 overflow-hidden hero-gradient">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 font-display">AI-Powered Service Booking</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-[1.1] mb-6 text-slate-900 tracking-tighter">
            Whatever you need, <br />
            <span className="gradient-text min-h-[1.2em] inline-block">
              {displayText}
              <span className="animate-pulse ml-1 text-slate-400">|</span>
            </span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed font-medium">
            Send a message in any language—Roman Urdu, English, or more. Our AI understands your context, finds the best professional nearby, and books your service instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <button
              onClick={showIosSoon}
              className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all hover:-translate-y-1 shadow-xl shadow-slate-900/20 group"
            >
              <AppleLogo size={24} />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold opacity-70 leading-none">Download on</div>
                <div className="text-lg leading-none mt-1">App Store</div>
              </div>
            </button>
            <button
              onClick={openAndroidApp}
              className="flex items-center justify-center gap-3 bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold hover:border-brand-primary hover:text-brand-primary transition-all hover:-translate-y-1 shadow-lg group"
            >
              <PlayCircle size={24} />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold opacity-70 leading-none">Get it on</div>
                <div className="text-lg leading-none mt-1">Google Play</div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-8 py-4 px-6 border border-slate-200 rounded-3xl bg-white/50 backdrop-blur-sm w-fit">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-sm bg-slate-200">
                  <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <p className="text-sm font-bold text-slate-600">50k+ Happy Users</p>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          {/* Main Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10 animate-float"
          >
            <div className="relative mx-auto w-[280px] h-[580px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl overflow-hidden border-[8px] border-slate-800">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
              <div className="h-full w-full bg-[#fdfdfd] rounded-[2.2rem] overflow-hidden relative flex flex-col font-sans">
                {/* Status Bar / Header */}
                <div className="p-4 pt-8 flex items-center justify-between border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="text-brand-primary">
                      <Search size={14} className="rotate-90" />
                    </div>
                    <div>
                      <div className="text-[8px] uppercase font-bold text-slate-400 leading-none">Current Location</div>
                      <div className="text-[10px] font-bold text-slate-800 leading-none mt-0.5">DHA, Lahore</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Star size={12} />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                      <img src="https://i.pravatar.cc/100?u=ali" alt="Ali" />
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 leading-tight">
                    Hello, Ali<br />
                    <span className="text-sm font-medium text-slate-500">What can we help you fix today?</span>
                  </h3>

                  {/* AI Search Bar */}
                  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex items-center gap-3 mb-4">
                    <div className="text-brand-primary shrink-0 opacity-50">
                      <Sparkles size={16} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">AC kaam nahi kar raha...</div>
                    <div className="ml-auto text-slate-300">
                      <MessageSquare size={14} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mb-6 overflow-x-hidden">
                    {["AC not cooling", "Plumber needed"].map((tag, i) => (
                      <div key={i} className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-bold text-slate-600 whitespace-nowrap">
                        {tag}
                      </div>
                    ))}
                  </div>

                  {/* Smart Assurance */}
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-brand-primary shrink-0 rounded-lg flex items-center justify-center text-white">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-brand-primary">Smart Assurance</div>
                      <div className="text-[8px] text-slate-500 leading-tight">Verified professionals at your doorstep.</div>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-slate-400" />
                  </div>

                  {/* Popular Services Grid */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-slate-800 tracking-wider font-display uppercase">Popular Services</span>
                    <span className="text-[8px] font-bold text-brand-primary">VIEW ALL</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { name: "AC Service", icon: <Wind size={16} /> },
                      { name: "Plumbing", icon: <Droplets size={16} /> },
                      { name: "Electrical", icon: <Zap size={16} /> },
                      { name: "Cleaning", icon: <Sparkles size={16} /> },
                    ].map((s, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-50 shadow-xs flex flex-col items-center gap-2">
                        <div className="w-8 h-8 bg-slate-50 text-brand-primary rounded-lg flex items-center justify-center">
                          {s.icon}
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">{s.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Banner */}
                  <div className="bg-slate-900 rounded-xl p-4 relative overflow-hidden h-24 flex flex-col justify-center">
                    <div className="absolute right-[-10%] bottom-0 w-1/2 h-full opacity-50 bg-gradient-to-l from-brand-primary/20 to-transparent">
                      <Hammer className="absolute bottom-2 right-2 text-brand-primary opacity-20" size={48} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-[6px] font-bold text-white/50 uppercase tracking-widest mb-1">Summer Offer</div>
                      <div className="text-[10px] font-bold text-white leading-tight mb-2">20% OFF on AC<br />Services</div>
                      <button className="bg-white text-slate-900 px-3 py-1 rounded-md text-[8px] font-bold">BOOK NOW</button>
                    </div>
                  </div>
                </div>

                {/* Bottom Nav */}
                <div className="bg-white border-t border-slate-100 p-2 px-6 flex items-center justify-between">
                  <div className="flex flex-col items-center gap-0.5 text-brand-primary">
                    <Smartphone size={14} />
                    <span className="text-[6px] font-bold">Home</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-slate-300">
                    <BookOpen size={14} />
                    <span className="text-[6px] font-bold">Bookings</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-slate-300">
                    <Users size={14} />
                    <span className="text-[6px] font-bold">Profile</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="absolute top-20 -right-4 z-20 glass p-4 rounded-2xl shadow-xl max-w-[180px] hidden lg:block"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-xs font-bold font-display">Booking Confirmed</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Ahmed (Electrician) will arrive at 10:00 AM</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-20 -left-10 z-20 bg-slate-900 p-4 rounded-2xl shadow-xl max-w-[200px] hidden lg:block"
          >
            <div className="flex gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <MessageSquare size={16} />
              </div>
              <span className="text-xs text-white font-medium">"I need an AC service today at 5pm"</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-full bg-brand-secondary"
              />
            </div>
          </motion.div>

          {/* Background shapes */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] -z-10" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-secondary/10 rounded-full blur-[80px] -z-10" />
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      title: "Speak your mind",
      desc: "Send a message in English, Roman Urdu, or any language describing the service you need.",
      icon: <MessageSquare size={32} />,
      color: "bg-blue-500"
    },
    {
      title: "AI Smart Match",
      desc: "Our AI analyzes location, time, and service type to find the top-rated professional nearby.",
      icon: <Search size={32} />,
      color: "bg-brand-secondary"
    },
    {
      title: "Instant Confirmation",
      desc: "Your booking is created automatically. Relax while we bring the expert to your doorstep.",
      icon: <CheckCircle2 size={32} />,
      color: "bg-green-500"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">How it works</h2>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Booking a professional has never been this intuitive. No more forms, just a quick message.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector lines (Desktop) */}
          <div className="hidden md:block absolute top-[100px] left-[25%] right-[25%] h-0.5 bg-slate-100 -z-10" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.2 }}
              className="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
            >
              <div className={`w-20 h-20 ${step.color} text-white rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-${step.color.split('-')[1]}-200 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6`}>
                {step.icon}
              </div>
              <h3 className="text-2xl font-display font-bold mb-4">{step.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const services = [
    { name: "Locksmith", icon: <Lock size={24} />, color: "bg-amber-100 text-amber-600" },
    { name: "Pest Control", icon: <Bug size={24} />, color: "bg-lime-100 text-lime-600" },
    { name: "Electrician", icon: <Zap size={24} />, color: "bg-yellow-100 text-yellow-600" },
    { name: "Appliance Repair", icon: <Wrench size={24} />, color: "bg-slate-100 text-slate-600" },
    { name: "Painter", icon: <Paintbrush size={24} />, color: "bg-orange-100 text-orange-600" },
    { name: "Plumbing", icon: <Droplets size={24} />, color: "bg-blue-100 text-blue-600" },
    { name: "Beautician", icon: <Scissors size={24} />, color: "bg-pink-100 text-pink-600" },
    { name: "Electrical", icon: <Plug size={24} />, color: "bg-indigo-100 text-indigo-600" },
    { name: "AC Technician", icon: <Wind size={24} />, color: "bg-cyan-100 text-cyan-600" },
    { name: "Plumber", icon: <Droplets size={24} />, color: "bg-sky-100 text-sky-600" },
    { name: "Carpenter", icon: <Hammer size={24} />, color: "bg-red-100 text-red-600" },
    { name: "Home Cleaning", icon: <Sparkles size={24} />, color: "bg-purple-100 text-purple-600" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section id="services" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">Services at your fingertips</h2>
            <p className="text-slate-500 text-lg font-medium">From daily chores to specialized technical repairs, we have verified professionals across every category ready to help you.</p>
          </div>
          <button className="text-brand-primary font-bold flex items-center gap-2 hover:gap-3 transition-all">
            See all categories <ChevronRight size={20} />
          </button>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              variants={item}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                {service.icon}
              </div>
              <span className="text-sm font-bold text-slate-700 font-display">{service.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Remove mock PlusSquare

const Features = () => {
  const features = [
    { title: "Context Aware AI", desc: "Our models understand slang, local languages, and nuances better than anyone.", icon: <Zap size={24} /> },
    { title: "Multi-Language", desc: "Speak in Urdu, English, Roman Urdu or Pashto. We understand it all.", icon: <Globe2 size={24} /> },
    { title: "Real-time Matching", desc: "Get matched with an available pro in less than 30 seconds.", icon: <Timer size={24} /> },
    { title: "Smart Location", desc: "Predictive routing to find pros closest to your precise location.", icon: <Smartphone size={24} /> },
    { title: "Verified Pros", desc: "Every professional goes through a rigorous multi-step background check.", icon: <ShieldCheck size={24} /> },
    { title: "Instant Confirm", desc: "No back-and-forth calls. Direct booking once you say yes.", icon: <CheckCircle2 size={24} /> },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-10 tracking-tight leading-tight">Built with the world's <br /> <span className="gradient-text">smartest technologies.</span></h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-brand-primary/5 text-brand-primary rounded-lg flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-slate-800">{f.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-primary/20"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
              <ShieldCheck size={32} className="text-brand-primary" />
            </div>
            <blockquote className="text-2xl font-display font-medium leading-relaxed mb-8 italic">
              "We haven't just built an app; we've built a personal assistant that understands the heartbeat of your city."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800">
                <img src="/teampictures/Moiz Naveed.png" alt="Founder" />
              </div>
              <div>
                <div className="font-bold">Moiz Naveed</div>
                <div className="text-sm text-white/50">Founder, Karigar.ai</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const reviews = [
    { name: "Sara Khan", role: "Home Maker", comment: "Bohut asaan hai! I just messaged 'Yaar AC theek karwa do' and instantly got a pro. No more hunting for numbers.", rating: 5 },
    { name: "John Doe", role: "Software Engineer", comment: "The Roman Urdu understanding is phenomenal. It's actually faster than any other app I've used.", rating: 5 },
    { name: "Aisha Malik", role: "Store Owner", comment: "Verified professionals give me peace of mind. Highly recommended for any household chore.", rating: 4 },
  ];

  return (
    <section className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-display font-bold text-center mb-16 tracking-tight">Loved by common people.</h2>

        <div className="flex flex-col md:flex-row gap-8 overflow-visible">
          {reviews.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative"
            >
              <div className="flex items-center gap-1 text-yellow-400 mb-6">
                {Array(5).fill(0).map((_, idx) => (
                  <Star key={idx} size={16} fill={idx < r.rating ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-slate-700 text-lg font-medium leading-relaxed mb-8 italic">"{r.comment}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                  <img src={`https://i.pravatar.cc/100?u=user${i}`} alt={r.name} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{r.name}</div>
                  <div className="text-sm text-slate-500 font-medium">{r.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Team = () => {
  const team: { name: string; role: string; desc: string; img: string; linkedin?: string }[] = [
    { name: "Jazeb Javed", role: "Founder & CEO", desc: "Full-stack specialist focused on crafting premium user experiences.", img: "/teampictures/Jazeb Javed.png", linkedin: "https://www.linkedin.com/in/muhammad-jazeb-javed-9472ab225/" },
    { name: "Moiz Naveed", role: "Co-Founder & Lead Developer", desc: "Visionary leader passionate about localized AI systems.", img: "/teampictures/Moiz Naveed.png", linkedin: "https://pk.linkedin.com/in/moiz-naveed-924015231" },
    { name: "Aun Muhammad", role: "Co-Founder & CTO", desc: "Expert in scalable architectures and AI integration.", img: "/teampictures/Aun Muhammad.png", linkedin: "https://www.linkedin.com/in/syed-aun-muhammad-3066a524a" },
  ];

  return (
    <section id="team" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
            Meet{" "}
            <a
              href="https://koderspace.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Koderspace"
              className="inline-flex items-center gap-2 align-middle hover:opacity-80 transition-opacity"
            >
              <span className="gradient-text">Koderspace Team</span>
              <ExternalLink size={28} strokeWidth={2.5} className="text-brand-primary" />
            </a>
          </h2>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">The humans behind the magic, making urban living simpler every day.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {team.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 text-center hover:bg-slate-900 transition-all duration-500 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:bg-brand-primary/20" />
              <div className="w-24 h-24 rounded-full mx-auto mb-6 p-1 border-2 border-brand-primary overflow-hidden transition-all duration-500 group-hover:scale-110 group-hover:border-white shadow-xl">
                <img
                  src={m.img}
                  className="w-full h-full object-cover object-top rounded-full"
                  alt={m.name}
                />
              </div>
              <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-white transition-colors">{m.name}</h3>
              <div className="text-brand-primary font-bold text-sm uppercase tracking-wider mb-4 group-hover:text-brand-secondary transition-colors underline decoration-2 underline-offset-4">{m.role}</div>
              <p className="text-slate-500 font-medium group-hover:text-slate-300 transition-colors leading-relaxed">{m.desc}</p>
              {m.linkedin && (
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  className="relative z-10 inline-flex items-center justify-center w-11 h-11 mt-6 rounded-full bg-white text-[#0A66C2] border border-slate-200 shadow-sm hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] hover:scale-110 transition-all duration-300 group-hover:border-white/20"
                >
                  <Linkedin size={20} fill="currentColor" strokeWidth={1.5} />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  const showIosSoon = useIosSoon();
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-brand-primary rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-primary/30"
        >
          {/* Background visuals */}
          <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary rounded-full blur-[150px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tight">Ready to experience <br /> the future of service?</h2>
            <p className="text-white/80 text-xl mb-12 font-medium">Download Karigar.ai today and book your first service in seconds. Available on iOS and Android.</p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button
                onClick={showIosSoon}
                className="flex items-center gap-4 bg-white text-brand-primary px-10 py-5 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all hover:-translate-y-2 shadow-2xl group"
              >
                <AppleLogo size={32} />
                <div className="text-left">
                  <div className="text-xs uppercase font-bold opacity-70 leading-none">Download on</div>
                  <div className="leading-none mt-1">App Store</div>
                </div>
              </button>
              <button
                onClick={openAndroidApp}
                className="flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xl border-2 border-white/10 transition-all hover:bg-black hover:-translate-y-2 shadow-2xl group"
              >
                <PlayCircle size={32} />
                <div className="text-left">
                  <div className="text-xs uppercase font-bold opacity-70 leading-none">Get it on</div>
                  <div className="leading-none mt-1">Google Play</div>
                </div>
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 opacity-60 grayscale brightness-200">
              <span className="font-bold text-lg">FAST COMPANY</span>
              <span className="font-bold text-lg">TECHCRUNCH</span>
              <span className="font-bold text-lg">FORBES</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="pt-20 pb-10 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white">
                <Logo size={20} />
              </div>
              <span className="text-xl font-display font-bold">Karigar.ai</span>
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
              Making urban life effortless through artificial intelligence. Based in Lahore, serving the world.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary cursor-pointer transition-all">
                <Globe2 size={18} />
              </div>
              <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary cursor-pointer transition-all">
                <MessageSquare size={18} />
              </div>
              <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary cursor-pointer transition-all">
                <Users size={18} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
            <ul className="space-y-4">
              {["About Us", "Careers", "Press", "News"].map((item) => (
                <li key={item} className="text-slate-500 text-sm font-medium hover:text-brand-primary transition-colors cursor-pointer">{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
            <ul className="space-y-4">
              {["Become a Partner", "Help Center", "Safe Service Guide", "App Status"].map((item) => (
                <li key={item} className="text-slate-500 text-sm font-medium hover:text-brand-primary transition-colors cursor-pointer">{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Contact</h4>
            <div className="space-y-4">
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <MessageSquare size={16} /> support@karigar.ai
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-widest">Office</p>
                <p className="text-sm text-slate-600 font-bold">12A, Gulberg III, Lahore, PK 54000</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-slate-50 gap-4">
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">© 2026 Karigar.ai TECHNOLOGIES. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <span className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors uppercase tracking-widest">Privacy Policy</span>
            <span className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors uppercase tracking-widest">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const IosComingSoonModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Decorative floating sparkles around the icon.
  const sparkles: { top: string; left?: string; right?: string; size: number; delay: number }[] = [
    { top: "12%", left: "14%", size: 16, delay: 0 },
    { top: "20%", right: "16%", size: 22, delay: 0.6 },
    { top: "44%", left: "8%", size: 14, delay: 1.1 },
    { top: "38%", right: "9%", size: 18, delay: 0.3 },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-[2rem] p-8 pt-12 text-center shadow-2xl overflow-hidden"
          >
            {/* Ambient glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-primary/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-10 w-64 h-64 bg-brand-secondary/20 rounded-full blur-[90px] pointer-events-none" />

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Floating sparkles */}
            {sparkles.map((s, i) => (
              <motion.div
                key={i}
                className="absolute text-brand-primary/60 pointer-events-none"
                style={{ top: s.top, left: s.left, right: s.right }}
                animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3], rotate: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: s.delay, ease: "easeInOut" }}
              >
                <Sparkles size={s.size} fill="currentColor" />
              </motion.div>
            ))}

            {/* Animated Apple icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="relative mx-auto mb-6 w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/30"
            >
              <AppleLogo size={40} />
              <span className="absolute -top-2 -right-2 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary" />
              </span>
            </motion.div>

            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black uppercase tracking-widest mb-4">
              Coming Soon
            </span>

            <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-3 tracking-tight">
              The iOS app is almost here
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Our engineers are putting the final polish on the iPhone experience.
              It'll be live on the App Store very soon. In the meantime, grab the Android
              build and start booking today.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { onClose(); openAndroidApp(); }}
                className="flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all hover:-translate-y-0.5 shadow-lg"
              >
                <PlayCircle size={22} />
                Get the Android app instead
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors py-1"
              >
                I'll wait for iOS
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [iosSoonOpen, setIosSoonOpen] = useState(false);

  return (
    <IosSoonContext.Provider value={() => setIosSoonOpen(true)}>
      <div className="min-h-screen selection:bg-brand-primary selection:text-white overflow-x-hidden">
        <Navbar />
        <Hero />
        <HowItWorks />
        <Services />
        <Features />
        <Testimonials />
        <Team />
        <CTA />
        <Footer />

        <IosComingSoonModal open={iosSoonOpen} onClose={() => setIosSoonOpen(false)} />

        {/* Visual noise/grain overlay for premium feel */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
      </div>
    </IosSoonContext.Provider>
  );
}

