import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

function MobileFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mobile-fab md:hidden"
      aria-label="New conversation"
    >
      <PlusIcon />
    </button>
  );
}

export default MobileFAB;
