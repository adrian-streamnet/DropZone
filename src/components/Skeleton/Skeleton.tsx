
import React from "react";

const SkeletonLoader = () => {
  return (
    <tr className="animate-pulse border-b border-gray-600">
      <td className="p-3 bg-gray-900 rounded h-3 w-1/2"></td>
      <td className="p-3 bg-gray-900 rounded h-3 w-1/4"></td>
      <td className="p-3 bg-gray-900 rounded h-3 w-1/4"></td>
    </tr>
  );
};

export default SkeletonLoader;
