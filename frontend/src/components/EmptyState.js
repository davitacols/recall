import React from 'react';

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    )}
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-md">{description}</p>
    {action && actionLabel && (
      <button
        onClick={action}
        className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const NoResults = ({ searchTerm, onClear }) => (
  <EmptyState
    icon={(props) => (
      <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )}
    title="No results found"
    description={searchTerm ? `No results for "${searchTerm}". Try adjusting your search.` : "No items to display."}
    action={searchTerm ? onClear : null}
    actionLabel="Clear search"
  />
);

export const NoData = ({ type = "items", onCreate }) => (
  <EmptyState
    icon={(props) => (
      <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    )}
    title={`No ${type} yet`}
    description={`Get started by creating your first ${type.slice(0, -1)}.`}
    action={onCreate}
    actionLabel={`Create ${type.slice(0, -1)}`}
  />
);

export const ErrorState = ({ onRetry }) => (
  <EmptyState
    icon={(props) => (
      <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    title="Something went wrong"
    description="We couldn't load this content. Please try again."
    action={onRetry}
    actionLabel="Try again"
  />
);
