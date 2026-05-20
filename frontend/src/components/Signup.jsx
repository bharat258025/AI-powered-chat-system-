import { Eye } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4002";

function Signup() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/user/signup/request-otp`,
        {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        },
        { withCredentials: true }
      );
      setOtpSent(true);
      alert(data.message || "OTP sent");
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.errors || "Signup Failed";
      if (status === 409) {
        alert("This email is already registered. Please use a different email or login.");
        return;
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/user/signup/verify-otp`,
        { email: formData.email.trim().toLowerCase(), otp: otp.trim() },
        { withCredentials: true }
      );
      alert(data.message || "Signup successful");
      navigate("/login");
    } catch (error) {
      alert(error?.response?.data?.errors || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-[#1e1e1e] text-white w-full max-w-md rounded-2xl p-6 shadow-lg">
        <h1 className="text-white items-center justify-center text-center">Signup</h1>
        <div className="mb-4 mt-2"><input className="w-full bg-transparent border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]" type="text" name="firstName" placeholder="firstName" value={formData.firstName} onChange={handleChange} /></div>
        <div className="mb-4 mt-2"><input className="w-full bg-transparent border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]" type="text" name="lastName" placeholder="lastName" value={formData.lastName} onChange={handleChange} /></div>
        <div className="mb-4 mt-2"><input className="w-full bg-transparent border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]" type="text" name="email" placeholder="email" value={formData.email} onChange={handleChange} /></div>
        <div className="mb-4 mt-2 relative"><input className="w-full bg-transparent border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]" type="password" name="password" placeholder="password" value={formData.password} onChange={handleChange} /><span className=" absolute right-3 top-3 text-gray-400"><Eye size={18} /></span></div>
        <p className="text-xs text-gray-400 mt-4 mb-6">By signing up or logging in, you consent to DeepSeek's <a className="underline" href="#" onClick={(e) => e.preventDefault()}>Terms of Use</a> and <a className=" underline" href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.</p>
        {otpSent && <div className="mb-4 mt-2"><input className="w-full bg-transparent border border-gray-600 rounded-md px-4 py-3 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6ff0]" type="text" name="otp" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} /></div>}
        <button onClick={otpSent ? handleVerifyOtp : handleRequestOtp} disabled={loading} className=" w-full bg-[#7a6ff6] hover:bg-[#6c61a6] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">{loading ? "Please wait... " : otpSent ? "Verify OTP" : "Send OTP"}</button>
        <div className="flex justify-between mt-4 text-sm"><a className="text-[#7a6ff6] hover:underline" href="#" onClick={(e) => e.preventDefault()}>Already registered?</a><Link className="text-[#7a6ff6] hover:underline" to="/login">Login</Link></div>
      </div>
    </div>
  );
}

export default Signup;
