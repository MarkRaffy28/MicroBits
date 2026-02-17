import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const AnimatedTableRow = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5, triggerOnce: false });
  
  return (
    <motion.tr
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      className="cursor-pointer"
    >
      {children}
    </motion.tr>
  );
};

const AnimatedTableRows = ({
  items = [],
  onItemSelect,
  enableArrowNavigation = true,
  initialSelectedIndex = -1
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const tableRef = useRef(null);

  const handleItemMouseEnter = useCallback(index => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item, index) => {
      setSelectedIndex(index);
      if (onItemSelect) {
        onItemSelect(item, index);
      }
    },
    [onItemSelect]
  );

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = e => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  return (
    <>
      {items.map((item, index) => (
        <AnimatedTableRow
          key={index}
          delay={0.05}
          index={index}
          onMouseEnter={() => handleItemMouseEnter(index)}
          onClick={() => handleItemClick(item, index)}
        >
          {item}
        </AnimatedTableRow>
      ))}
    </>
  );
};

export default AnimatedTableRows;