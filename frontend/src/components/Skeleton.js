import React from 'react';

export const Skeleton = ({ className = '', variant = 'text', width, height }) => {
  const baseClass = 'animate-pulse bg-gray-200 rounded';
  
  const variants = {
    text: 'h-4',
    title: 'h-8',
    avatar: 'w-10 h-10 rounded-full',
    card: 'h-32',
    button: 'h-10 w-24'
  };

  const style = {
    width: width || '100%',
    height: height
  };

  return (
    <div 
      className={`${baseClass} ${variants[variant]} ${className}`}
      style={style}
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
    <Skeleton variant="title" width="60%" />
    <Skeleton width="100%" />
    <Skeleton width="80%" />
    <div className="flex gap-2 mt-4">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </div>
  </div>
);

export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" />
          <Skeleton width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div className="border-b border-gray-200 p-4">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="100px" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b border-gray-200 p-4 last:border-0">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width="100px" />
          ))}
        </div>
      </div>
    ))}
  </div>
);
