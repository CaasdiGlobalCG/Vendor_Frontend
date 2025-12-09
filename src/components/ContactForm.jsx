import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import config from '../config/env';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const [startTyping, setStartTyping] = useState(false);
  const typingRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setStartTyping(true);
      }
    });
    const currentTypingRef = typingRef.current;
    if (currentTypingRef) {
      observer.observe(currentTypingRef);
    }
    return () => {
      if (currentTypingRef) {
        observer.unobserve(currentTypingRef);
      }
      observer.disconnect();
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/contact`, formData);
      toast.success(response.data.message || "Form submitted successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting form", error);
      toast.error("Form submission failed. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const typingAnimationClass = startTyping 
    ? "animate-typing border-r-3 border-white animate-blink whitespace-nowrap overflow-hidden" 
    : "border-r-3 border-transparent";

  return (
    <section className="relative w-full min-h-screen py-20 bg-gradient-to-br from-black via-black to-[rgba(33,190,156,0.5)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 flex flex-wrap gap-[60px]">
        <div className="flex-1 min-w-[300px] flex flex-col justify-center max-[576px]:items-center">
          <h2 className="font-['Poppins'] text-[60px] font-semibold leading-[1.5] mb-[60px] max-w-[500px] text-white text-left max-[576px]:text-[36px] max-[576px]:text-center max-[576px]:max-w-full max-[576px]:mb-2">
            <span 
                ref={typingRef}
                className={`inline-flex items-center ${typingAnimationClass} 
                           max-[576px]:text-[30px] max-[576px]:whitespace-normal max-[576px]:border-none max-[576px]:animate-none`}
            >
                Get in Touch:&nbsp;
            </span>
            <span className="bg-gradient-to-r from-[#21be9c] to-[#f88feb] bg-clip-text text-transparent max-[576px]:text-[30px]">
              We're Here to Answer Your Questions
            </span>
          </h2>
          <button 
            className="relative w-full max-w-[498px] h-[62px] rounded-[50px] cursor-pointer flex items-center justify-center p-0.5 group active:scale-95 transition-transform duration-200 ease-out max-[576px]:max-w-[75%]"
            onClick={() => window.open("https://wa.me/919606461633", "_blank")}
          >
            <span className="absolute inset-0 rounded-[50px] bg-gradient-to-r from-[#21be9c] to-[#0f5848] group-hover:opacity-90 transition-opacity"></span>
            <span className="relative z-10 w-full h-full bg-black rounded-[48px] flex items-center justify-center text-white font-['Poppins'] text-[20px] font-medium max-[576px]:text-[1.4rem]">
              Book your free consultant
            </span>
          </button>
        </div>

        <div className="flex-1 min-w-[300px] rounded-[21px] p-10 bg-transparent bg-cover flex flex-col justify-center items-center max-[576px]:min-w-full max-[576px]:p-3">
          <form 
            className="w-full h-full flex flex-col gap-5 p-6 sm:p-12 bg-gradient-to-br from-[#0f5848] to-[#21be9c] rounded-[30px] max-[576px]:p-3 max-[576px]:gap-2.5 max-[576px]:rounded-[20px]" 
            onSubmit={handleSubmit}
          >
            <div className="pb-4 text-center">
              <h3 className="font-['Poppins'] text-[45px] font-medium text-white max-[576px]:text-[24px]">Get in Touch</h3>
              <p className="font-['Poppins'] text-xl font-normal leading-[1.5] text-white mt-2 max-[576px]:text-base">You can reach us any time</p>
            </div>

            <div className="flex gap-5 mb-0 max-[576px]:flex-col max-[576px]:gap-2.5">
              <div className="flex-1 mb-2 max-[576px]:mb-0">
                <input 
                  type="text" 
                  className="w-full h-[56px] bg-transparent border border-white rounded-[30px] px-5 text-white font-['Poppins'] text-base py-6 placeholder-[#c9c9c9] placeholder:font-light" 
                  name="firstName" 
                  placeholder="First name" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="flex-1 mb-2 max-[576px]:mb-0">
                <input 
                  type="text" 
                  className="w-full h-[56px] bg-transparent border border-white rounded-[30px] px-5 text-white font-['Poppins'] text-base py-6 placeholder-[#c9c9c9] placeholder:font-light" 
                  name="lastName" 
                  placeholder="Last name" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="mb-2">
              <input 
                type="email" 
                className="w-full h-[56px] bg-transparent border border-white rounded-[30px] px-5 text-white font-['Poppins'] text-base py-6 placeholder-[#c9c9c9] placeholder:font-light" 
                name="email" 
                placeholder="Email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="mb-2">
              <input 
                type="tel" 
                className="w-full h-[56px] bg-transparent border border-white rounded-[30px] px-5 text-white font-['Poppins'] text-base py-6 placeholder-[#c9c9c9] placeholder:font-light" 
                name="phone" 
                placeholder="Phone number" 
                value={formData.phone} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="mb-2">
              <textarea 
                className="w-full h-[166px] bg-transparent border border-white rounded-[30px] p-5 text-white font-['Poppins'] text-base resize-none placeholder-[#c9c9c9] placeholder:font-light" 
                name="message" 
                placeholder="Your message" 
                rows="5" 
                value={formData.message} 
                onChange={handleChange} 
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="w-[114px] h-[52px] bg-gradient-to-r from-[#21be9c] to-[#0f5848] border-none rounded-[16px] cursor-pointer self-end relative transition-transform duration-150 ease-in-out active:scale-90
                         max-[576px]:w-[75px] max-[576px]:h-[45px]"
            >
              <span className="text-white font-['Poppins'] text-xl font-medium leading-[1.5] relative z-[2] max-[576px]:text-sm max-[576px]:font-light">Submit</span>
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </section>
  );
};

export default ContactSection;
