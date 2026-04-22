import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowLeft, Stethoscope, Shield, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "forgot">("login");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // AuthContext handles role; redirect based on role
      // The router loaders will redirect appropriately
      navigate("/dashboard");
    } else {
      setError(result.error || "حدث خطأ. حاول مرة أخرى.");
    }
  };

  const features = [
    "إدارة متعددة العيادات والفروع",
    "تتبع المواعيد والمرضى بذكاء",
    "تقارير مالية متقدمة بالدينار الأردني",
    "تذكيرات واتساب تلقائية",
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ direction: "rtl", fontFamily: "Cairo, sans-serif" }}
    >
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F2547 0%, #1D5FBF 60%, #06B6D4 100%)" }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #60A5FA, transparent)" }} />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #22D3EE, transparent)" }} />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-5"
              style={{
                width: 60 + i * 15,
                height: 60 + i * 15,
                background: "white",
                top: `${10 + i * 15}%`,
                left: `${5 + i * 15}%`,
              }}
              animate={{ y: [0, -20, 0], opacity: [0.05, 0.1, 0.05] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
            <Stethoscope size={22} color="white" />
          </div>
          <div>
            <div className="text-white text-2xl font-black tracking-wide">Sadenix</div>
            <div className="text-blue-200 text-sm">منصة إدارة العيادات</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Sparkles size={12} color="#FCD34D" />
              <span className="text-xs text-white font-semibold">منصة SaaS متعددة العيادات</span>
            </div>
            <h2 className="text-white font-black leading-tight mb-4" style={{ fontSize: 36 }}>
              أدر عيادتك<br />
              <span style={{ color: "#93C5FD" }}>بذكاء واحترافية</span>
            </h2>
            <p className="text-blue-200 leading-relaxed mb-8" style={{ fontSize: 15, maxWidth: 380 }}>
              منصة Sadenix هي الحل المتكامل لإدارة عيادات الأسنان بكفاءة عالية، مع دعم كامل للغة العربية واحتياجات السوق الأردني.
            </p>

            <div className="space-y-3">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(34,211,238,0.3)" }}>
                    <CheckCircle size={12} color="#22D3EE" />
                  </div>
                  <span className="text-blue-100 text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-8 relative z-10"
        >
          {[
            { value: "+1", label: "عيادة نشطة" },
            { value: "+1", label: "مريض مسجل" },
            { value: "99.9%", label: "وقت التشغيل" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-white font-black text-xl">{stat.value}</div>
              <div className="text-blue-300 text-xs">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-[440px] flex items-center justify-center p-8"
        style={{ background: "#F0F5FC" }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
              <Stethoscope size={18} color="white" />
            </div>
            <span className="text-xl font-black" style={{ color: "#0F2547" }}>Sadenix</span>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-8"
            style={{
              background: "white",
              boxShadow: "0 4px 40px rgba(15,37,71,0.08)",
              border: "1px solid rgba(30,58,111,0.06)",
            }}
          >
            {activeTab === "login" ? (
              <>
                <div className="mb-7">
                  <h2 className="font-black mb-1" style={{ color: "#0F172A", fontSize: 22 }}>مرحبًا بعودتك</h2>
                  <p className="text-sm" style={{ color: "#64748B" }}>سجّل دخولك للوصول إلى لوحة التحكم</p>
                </div>

                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>
                      البريد الإلكتروني
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="example@clinic.com"
                      className="w-full px-4 h-11 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "#F0F5FC",
                        border: "1.5px solid transparent",
                        color: "#0F172A",
                        fontFamily: "Cairo, sans-serif",
                      }}
                      onFocus={e => e.target.style.border = "1.5px solid #1D5FBF"}
                      onBlur={e => e.target.style.border = "1.5px solid transparent"}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold" style={{ color: "#374151" }}>كلمة المرور</label>
                      <button
                        onClick={() => setActiveTab("forgot")}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "#1D5FBF" }}
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 h-11 rounded-xl text-sm outline-none transition-all pr-4 pl-11"
                        style={{
                          background: "#F0F5FC",
                          border: "1.5px solid transparent",
                          color: "#0F172A",
                          fontFamily: "Cairo, sans-serif",
                        }}
                        onFocus={e => e.target.style.border = "1.5px solid #1D5FBF"}
                        onBlur={e => e.target.style.border = "1.5px solid transparent"}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                      <AlertCircle size={13} style={{ color: "#DC2626" }} />
                      <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</span>
                    </div>
                  )}

                  {/* Security Note */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#EFF6FF" }}>
                    <Shield size={13} style={{ color: "#1D5FBF" }} />
                    <span className="text-xs" style={{ color: "#1D5FBF" }}>دخولك محمي بنظام Supabase Auth المشفّر</span>
                  </div>

                  {/* Login Button */}
                  <motion.button
                    id="login-submit"
                    onClick={handleLogin}
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-11 rounded-xl font-bold text-white text-sm transition-all relative overflow-hidden"
                    style={{
                      background: loading ? "#93BFEF" : "linear-gradient(135deg, #1D5FBF, #06B6D4)",
                    }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>جاري تسجيل الدخول...</span>
                      </div>
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("login")}
                  className="flex items-center gap-2 mb-6 text-sm font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: "#1D5FBF" }}
                >
                  <ArrowLeft size={14} />
                  العودة لتسجيل الدخول
                </button>
                <div className="mb-7">
                  <h2 className="font-black mb-1" style={{ color: "#0F172A", fontSize: 22 }}>استعادة كلمة المرور</h2>
                  <p className="text-sm" style={{ color: "#64748B" }}>سنرسل رابط الاستعادة على بريدك الإلكتروني</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>البريد الإلكتروني</label>
                    <input
                      type="email"
                      placeholder="أدخل بريدك الإلكتروني"
                      className="w-full px-4 h-11 rounded-xl text-sm outline-none"
                      style={{ background: "#F0F5FC", border: "1.5px solid transparent", color: "#0F172A", fontFamily: "Cairo, sans-serif" }}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-11 rounded-xl font-bold text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                  >
                    إرسال رابط الاستعادة
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: "#94A3B8" }}>
            © 2026 Sadenix · جميع الحقوق محفوظة
          </p>
        </div>
      </motion.div>
    </div>
  );
}