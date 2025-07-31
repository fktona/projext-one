"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface ComingSoonRedirectProps {
  featureName?: string;
  message?: string;
  showButton?: boolean;
}

export default function ComingSoonRedirect({
  featureName = "This feature",
  message = "is coming soon!",
  showButton = true,
}: ComingSoonRedirectProps) {
  const router = useRouter();

  const handleRedirect = () => {
    router.push("/coming-soon");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        {/* Icon */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-16 h-16 mx-auto bg-gradient-to-br from-[#BFBBFF] to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        >
          <span className="text-2xl">🚀</span>
        </motion.div>

        {/* Text */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-2xl font-instru font-bold text-white mb-3"
        >
          {featureName}
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-gray-400 text-lg mb-8 font-inter"
        >
          {message}
        </motion.p>

        {/* Button */}
        {showButton && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRedirect}
            className="px-6 py-3 bg-gradient-to-r from-[#BFBBFF] to-purple-600 text-white font-instru font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Learn More
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}