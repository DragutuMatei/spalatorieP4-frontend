import React, { useEffect } from "react";

// Colors from request
const COLORS = {
    green: "#208A39",
    yellow: "#FFC300",
    darkBlue: "#003566",
    lightBlue: "#EBF2FA",
    dark: "#1D1D1D",
    white: "#FFFFFF",
};

const CadathonPopup = ({ onClose }) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(29, 29, 29, 0.85)", // #1D1D1D with opacity
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                padding: "20px",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: COLORS.green, // #208A39
                    borderRadius: "16px",
                    maxWidth: "750px",
                    width: "100%",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                    position: "relative",
                    animation: "fadeIn 0.3s ease-out",
                }}
            >
                {/* Header Strip */}
                <div
                    style={{
                        padding: "20px",
                        textAlign: "center",
                        color: COLORS.dark,
                        backgroundColor: COLORS.darkBlue,
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
                        <span style={{ color: COLORS.yellow }}>CADathon</span> Ediția 2
                    </h2>
                </div>

                {/* Content */}
                <div style={{ padding: "10px 24px 24px", textAlign: "center", color: COLORS.white }}>
                    <p
                        style={{
                            fontSize: "1.1rem",
                            marginBottom: "20px",
                            lineHeight: "1.5",
                            fontWeight: "700",
                            color: COLORS.lightBlue,
                        }}
                    >
                        Ai auzit de cea mai mare competiție de CAD din Europa?
                    </p>

                    <div style={{ margin: "20px 0" }}>
                        <a
                            href="https://cadathon.osfiir.ro/inscriere"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn"
                            style={{
                                display: "inline-block",
                                backgroundColor: COLORS.yellow, // #FFC300
                                color: COLORS.dark, // #1D1D1D
                                padding: "12px 24px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "1rem",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                transition: "transform 0.2s",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            Înscrie-te acum!
                        </a>

                    </div>

                    <p style={{ fontSize: "1.05rem", color: COLORS.lightBlue, marginBottom: "10px", fontWeight: "500" }}>
                        Pentru mai multe detalii despre concurs intră pe:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <a
                            href="https://www.instagram.com/osfiir"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: COLORS.yellow,
                                fontWeight: "bold",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "1.2rem"
                            }}
                        >
                            <svg style={{ width: "34px", height: "34px" }} viewBox="0 0 24 24">
                                <path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                            </svg>
                            @osfiir
                        </a>
                        <span style={{ color: COLORS.lightBlue, fontWeight: "bold", fontSize: "1.05rem" }}>sau</span>
                        <a
                            href="https://cadathon.osfiir.ro/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: COLORS.yellow,
                                fontWeight: "bold",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "1.2rem"
                            }}
                        >
                            <svg style={{ width: "34px", height: "34px" }} viewBox="0 0 24 24">
                                <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56c1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A8.03 8.03 0 0 1 5.08 16zm2.95-8H5.08a8.03 8.03 0 0 1 1.38-3.56c.6 1.11 1.06 2.31 1.38 3.56zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-1.38 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
                            </svg>
                            cadathon.osfiir.ro
                        </a>
                    </div>

                </div>

                {/* Footer / Close Action */}
                <div style={{ padding: "0 24px 24px", textAlign: "center" }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: `2px solid ${COLORS.dark}`,
                            color: COLORS.dark,
                            padding: "8px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                        }}
                    >
                        Închide
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

export default CadathonPopup;
