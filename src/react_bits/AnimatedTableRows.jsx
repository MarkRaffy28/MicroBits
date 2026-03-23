import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const AnimatedTableRow = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0, triggerOnce: true });

  return (
    <motion.tr
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.tr>
  );
};

const AnimatedTableRows = ({ items = [], rowDelay = 0.05 }) => (
  <>
    {items.map((item, index) => (
      <AnimatedTableRow key={index} delay={index * rowDelay}>
        {item}
      </AnimatedTableRow>
    ))}
  </>
);

export default AnimatedTableRows;