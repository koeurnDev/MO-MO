import React from 'react';

const ProfileSkeleton = () => {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 bg-bg-soft rounded-full mb-4"></div>
        <div className="h-6 bg-bg-soft rounded w-40 mb-2"></div>
        <div className="h-4 bg-bg-soft rounded w-24"></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="h-24 bg-bg-soft rounded-3xl"></div>
        <div className="h-24 bg-bg-soft rounded-3xl"></div>
      </div>
      
      <div className="space-y-4">
        <div className="h-12 bg-bg-soft rounded-2xl w-full"></div>
        <div className="h-12 bg-bg-soft rounded-2xl w-full"></div>
        <div className="h-12 bg-bg-soft rounded-2xl w-1/2"></div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
