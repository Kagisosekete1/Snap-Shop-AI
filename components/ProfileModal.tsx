import React, { useRef, useState } from 'react';
import { User } from '../types';
import Button from './Button';
import Icon from './Icon';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfilePic: (base64: string) => void;
  onUpdateLocation: (location: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onLogout, onUpdateProfilePic, onUpdateLocation }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locationInput, setLocationInput] = useState(user.location || '');

  const handleProfilePicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateProfilePic(base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveLocation = () => {
    onUpdateLocation(locationInput);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl p-8 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <Icon name="close" className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 mb-6">
          <div className="relative group">
            {user.profilePic ? (
              <img src={user.profilePic} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                <Icon name="user" className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </button>
            <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} accept="image/*" className="hidden" />
          </div>
          <div className="text-center sm:text-left flex-grow">
            <h2 className="text-2xl font-bold text-white">{user.email}</h2>
            <div className="mt-2">
                <label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1">
                    <Icon name="location" className="w-4 h-4" />
                    Your Location (for local results)
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="location"
                        type="text"
                        placeholder="e.g., San Francisco, CA"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button onClick={handleSaveLocation} disabled={locationInput === (user.location || '')} variant="secondary">
                        Save
                    </Button>
                </div>
            </div>
          </div>
           <Button onClick={onLogout} variant="secondary" icon={<Icon name="logout" />} className="sm:ml-auto self-start sm:self-center">
            Logout
          </Button>
        </div>
        
        <div className="border-t border-gray-700 pt-6 flex flex-col flex-grow min-h-0">
            <h3 className="text-xl font-semibold text-indigo-400 mb-4">Search History</h3>
            <div className="flex-grow overflow-y-auto pr-2">
                {user.history.length > 0 ? (
                    <ul className="space-y-4">
                        {user.history.map(item => (
                            <li key={item.id} className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-lg">
                                <img src={item.previewSrc} alt="Search preview" className="w-16 h-16 object-cover rounded-md" />
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold text-gray-200 truncate" title={item.result.identifiedProduct}>{item.result.identifiedProduct}</p>
                                    <p className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <div className="text-center py-8 bg-gray-900/50 rounded-lg">
                        <p className="text-gray-400">Your search history is empty.</p>
                        <p className="text-sm text-gray-500">Start a new search to see your history here!</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
