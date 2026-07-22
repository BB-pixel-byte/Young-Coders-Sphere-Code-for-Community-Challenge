export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        twilight: "#2C3E50",
        "twilight-light": "#3D5266",
        amber: "#E8A838",
        "amber-soft": "#F5D78A",
        sage: "#6B9080",
        paper: "#FDFBF7",
        stone: "#F2EDE4",
        coral: "#E07A5F",
        ink: "#1E293B",
        steel: "#5D6D7E",
        cloud: "#94A3B8",
      },
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
    },
  },
  plugins: [],
};
