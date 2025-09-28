import React from "react";
import "../assets/styles/components/Spinner.scss";

const LoadingSpinner = ({ size = "md", inline = false, className = "" }) => {
  const classes = [
    "spinner",
    `spinner--${size}`,
    inline ? "spinner--inline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <span className="spinner__circle" />
    </span>
  );
};

export default LoadingSpinner;
