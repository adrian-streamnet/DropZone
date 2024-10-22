import { useState } from "react";

interface DropdownProps {
  options: { label: string; value: string; imageUrl?: string }[];
  selectedOption: string;
  onSelect: (value: string) => void;
}

const CustomDropdown: React.FC<DropdownProps> = ({
  options,
  selectedOption,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (value: string) => {
    onSelect(value);
    setIsOpen(false); // Close dropdown after selecting an option
  };

  return (
    <div className="relative inline-block text-left w-full">
      {/* Dropdown Header */}
      <div
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-2xl cursor-pointer"
        onClick={() => setIsOpen(!isOpen)} // Toggle dropdown open/close
      >
        <span>{selectedOption ? selectedOption : "Select an option"}</span>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-gray-700 border border-gray-600 rounded-2xl shadow-lg">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center p-3 cursor-pointer hover:bg-gray-600"
              onClick={() => handleOptionClick(option.value)}
            >
              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="w-6 h-6 rounded-full mr-2"
                />
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
