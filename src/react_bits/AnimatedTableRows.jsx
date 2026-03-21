import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const AnimatedTableRow = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  // animate when row is at least 50% in view, and only trigger once
  const inView = useInView(ref, { amount: 0.5, triggerOnce: true });

  return (
    <motion.tr
      ref={ref}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.tr>
  );
};

const AnimatedTableRows = ({ items = [], rowDelay = 0.05 }) => {
  return (
    <>
      {items.map((item, index) => (
        <AnimatedTableRow key={index} delay={index * rowDelay}>
          {item}
        </AnimatedTableRow>
      ))}
    </>
  );
};

export default AnimatedTableRows;
