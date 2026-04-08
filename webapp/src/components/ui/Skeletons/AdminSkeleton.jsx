import React from 'react';

const AdminSkeleton = () => {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 bg-bg-soft rounded w-32"></div>
        <div className="h-10 bg-bg-soft rounded-xl w-24"></div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="h-24 bg-bg-soft rounded-2xl"></div>
        <div className="h-24 bg-bg-soft rounded-2xl"></div>
        <div className="h-24 bg-bg-soft rounded-2xl"></div>
        <div className="h-24 bg-bg-soft rounded-2xl"></div>
      </div>
      
      <div className="bg-bg-soft rounded-3xl h-64 w-full mb-10"></div>
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-bg-soft rounded-2xl w-full"></div>
        ))}
      </div>
    </div>
  );
};

export default AdminSkeleton;
