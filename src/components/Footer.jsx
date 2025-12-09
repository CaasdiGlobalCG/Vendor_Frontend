

import React from "react";
import footerImage from '../assets/footer_image.png';

const Footer = () => {
  return (
    <footer className="relative w-full pt-15 pb-[30px] bg-black">
      <div className="max-w-[1440px] mx-auto px-5">
        <div className="flex flex-wrap justify-between items-start gap-[30px] lg:flex-nowrap md:text-left text-center">
          {/* Logo and Contact Info Column */}
          <div className="flex flex-col gap-[15px] p-5 flex-1 md:items-start items-center">
            <div className="flex items-center justify-start md:justify-start w-full">
            <div
  className="w-28 h-14 bg-no-repeat bg-center bg-cover lg:w-24 lg:h-12 md:w-20 md:h-10 sm:w-20 sm:h-10"
  style={{ backgroundImage: `url(${footerImage})` }}
></div>

              {/* <div className="w-28 h-14 bg-[url('../assets/footer_image.png')] bg-no-repeat bg-center bg-cover lg:w-24 lg:h-12 md:w-20 md:h-10 sm:w-20 sm:h-10"></div> */}
            </div>
            <div className="flex flex-col gap-[15px]">
              <h3 className="text-white font-poppins font-bold text-lg">Caasdi Global</h3>
              <p className="text-gray-400 font-poppins text-base leading-normal">
                #262, 80ft Road, BSK 1st stage, 2nd Block,<br />
                Srinivasnagar, Bengaluru, Karnataka-560050
              </p>
              <h3 className="text-white font-poppins font-bold text-lg">Contact Information</h3>
              <p className="text-gray-400 font-poppins text-base leading-normal">Email: corporate@caasdiglobal.in</p>
              <p className="text-gray-400 font-poppins text-base leading-normal">
                Phone: +91-9606461633, +91-9606461642, 
                <br />+91-9606461643
              </p>
            </div>
          </div>

          {/* Legal Links Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-bold text-lg">Legal</h3>
            <a href="#" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Terms and conditions
            </a>
            <a href="#" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Policies
            </a>
          </div>

          {/* Company Links Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-bold text-lg">Company</h3>
            <a href="#about" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              About Us
            </a>
            <a href="#expertise" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Expertise
            </a>
            <a href="#scroller" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Services
            </a>
            <a href="https://www.linkedin.com/company/caasdi-global/jobs/" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Career
            </a>
            <a href="https://www.linkedin.com/company/caasdi-global/posts/?feedView=all" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Blogs
            </a>
          </div>

          {/* Social Media Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-semibold text-lg">Follow Us</h3>
            <div className="flex gap-[15px]">
              <a href="https://www.instagram.com/caasdi_global/" className="block w-[30px] h-[30px] bg-[url('../assets/instagram.svg')] bg-no-repeat bg-center bg-cover sm:w-[25px] sm:h-[25px]" aria-label="Instagram"></a>
              <a href="https://in.linkedin.com/company/caasdi-global" className="block w-[30px] h-[30px] bg-[url('../assets/linkedin.svg')] bg-no-repeat bg-center bg-cover sm:w-[25px] sm:h-[25px]" aria-label="LinkedIn"></a>
              <a href="https://x.com/caasdiglobal" className="block w-[30px] h-[30px] bg-[url('../assets/twitter.svg')] bg-no-repeat bg-center bg-cover sm:w-[25px] sm:h-[25px]" aria-label="Twitter"></a>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-5">
          <p className="text-white font-poppins text-[clamp(14px,1vw,18px)] text-center">© Caasdi Global 2024 All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
