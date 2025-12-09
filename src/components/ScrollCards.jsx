import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import "../styles/ScrollCards.css";
gsap.registerPlugin(ScrollTrigger);

const VerticalScroll = ({ items, title }) => {
  const sectionRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const itemList = itemsRef.current;

    // Initial positions (vertical)
    itemList.forEach((item, index) => {
      if (index !== 0) {
        gsap.set(item, { yPercent: 100 }); // Changed to yPercent for vertical
      }
    });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin: true,
        start: "top top",
        end: () => `+=${items.length * 100}%`, // Vertical scroll distance
        scrub: 1,
        invalidateOnRefresh: true,
      },
      defaults: { ease: "none" },
    });

    itemList.forEach((item, index) => {
      timeline.to(item, {
        scale: 0.9,
        borderRadius: "10px",
      });

      if (index < items.length - 1) {
        timeline.to(itemList[index + 1], { yPercent: 0 }, "<"); // Changed to yPercent
      }
    });

    return () => {
      timeline.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [items.length]);

  return (
    <>
      <div className="section">
        <div className="container-medium">
          <div className="padding-vertical">
            <div className="max-width-large">
              <h1 className="heading">{title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div
        className="scroll-section vertical-section section" // Changed class name for CSS specificity
        ref={sectionRef}
        style={{ overflow: "hidden" }} // Prevent horizontal overflow
      >
        <div className="services-wrapper">
          <div
            role="list"
            className="list"
            style={{
              display: "flex",
              flexDirection: "column", // Stack items vertically
              height: "100%", // Ensure items take full viewport height
            }}
          >
            {items.map((item, index) => (
              <div
                key={index}
                role="listitem"
                className="item"
                ref={(el) => (itemsRef.current[index] = el)}
                style={{ height: "100%" }} // Each item takes full height
              >
                <div className="item_content">
                  <h2 className="item_number">{index + 1}</h2>

                  <div className="item_text">
                  <h1 className="item_title">{item.title}</h1>
                  <p className="item_p">{item.description}</p>
                  </div>

                </div>
                <video
                  src={item.video}
                  loading="lazy"
                  autoPlay
                  muted
                  loop
                  className="item_media"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const ScrollCards = () => {
  const items = [
    {
      title: "AI-Driven Automation",
      description:
        " Implementing intelligent workflows that enhance efficiency and accuracy across vendor management, procurement, and execution processes.",
      video:
        "https://videos.pexels.com/video-files/10178127/10178127-uhd_2560_1440_30fps.mp4",
    },
    {
      title: "Intelligent Vendor Matching",
      description:
      "Using advanced algorithms to connect businesses with the most suitable vendors based on quality, cost, and performance metrics.",
      video:
        "https://videos.pexels.com/video-files/15708463/15708463-uhd_2560_1440_24fps.mp4",
    },
    {
      title: "Seamless Digital Integration",
      description:
        " Creating a unified platform that connects businesses with vendors, clients, and service providers in a streamlined and efficient manner.",
      video:
        "https://videos.pexels.com/video-files/15708462/15708462-uhd_2560_1440_24fps.mp4",
    },
    {
      title: "Scalable & Customizable Solutions",
      description:
        " Offering flexible solutions that adapt to businesses of all sizes and industries, ensuring long-term success and scalability.",
      video:
        "https://videos.pexels.com/video-files/5788966/5788966-hd_1920_1080_25fps.mp4",
    },
    {
      title: "Compliance & Risk Management",
      description:
      "Ensuring adherence to regulatory requirements while proactively mitigating risks associated with vendor relationships and procurement.",
      video:
        "https://videos.pexels.com/video-files/5788966/5788966-hd_1920_1080_25fps.mp4",
    },
    {
      title: "End-to-End Project Execution",
      description:
        " Providing businesses with the tools and support needed to manage projects seamlessly from initiation to completion.",
      video:
        "https://videos.pexels.com/video-files/5788966/5788966-hd_1920_1080_25fps.mp4",
    },
  ];

  return (
    <section className="scroller" id="scroller">
    <main className="services-main-wrapper">
      <VerticalScroll
        items={items}
        title="Our Expertise"
      />
    </main>
    </section>
  );
};

export default ScrollCards;
