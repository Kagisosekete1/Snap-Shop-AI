import React, { useState, useRef, useCallback, useEffect } from 'react';
import { identifyAndSearch, searchWithText } from './services/geminiService';
import { ApiResult, User, SearchHistoryItem } from './types';
import Button from './components/Button';
import Icon from './components/Icon';
import Spinner from './components/Spinner';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';

const App: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [textQuery, setTextQuery] = useState('');
  const [visibleResultsCount, setVisibleResultsCount] = useState(6);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load user from localStorage on initial render
  useEffect(() => {
    try {
      const loggedInUserEmail = localStorage.getItem('currentUserEmail');
      if (loggedInUserEmail) {
        const usersData = JSON.parse(localStorage.getItem('users') || '{}');
        const userData = usersData[loggedInUserEmail];
        if (userData) {
          setCurrentUser({ email: loggedInUserEmail, ...userData });
        }
      }
    } catch (e) {
      console.error("Failed to parse user data from localStorage", e);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  const updateUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
        const usersData = JSON.parse(localStorage.getItem('users') || '{}');
        const { email, ...dataToSave } = user;
        usersData[email] = dataToSave;
        localStorage.setItem('users', JSON.stringify(usersData));
        localStorage.setItem('currentUserEmail', email);
    } else {
        localStorage.removeItem('currentUserEmail');
    }
  };

  const handleLogout = () => {
      updateUser(null);
      setProfileModalOpen(false);
      // Reset app state on logout
      setPreviewSrc(null);
      setImageData(null);
      setResult(null);
      setError(null);
  };
  
  const handleUpdateProfilePic = (base64: string) => {
      if (currentUser) {
          const updatedUser = { ...currentUser, profilePic: base64 };
          updateUser(updatedUser);
      }
  };
  
  const handleUpdateLocation = (location: string) => {
    if (currentUser) {
        const updatedUser = { ...currentUser, location: location };
        updateUser(updatedUser);
    }
  };

  const handleStartCamera = async () => {
    stopCamera();
    setPreviewSrc(null);
    setResult(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsCameraOn(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError('Camera not available or permission denied. Please try uploading an image.');
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewSrc(dataUrl);
    const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
    const base64 = dataUrl.split(',')[1];
    setImageData({ base64, mimeType });
    stopCamera();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      stopCamera();
      setResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreviewSrc(dataUrl);
        const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        const base64 = dataUrl.split(',')[1];
        setImageData({ base64, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!imageData || !currentUser) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setVisibleResultsCount(6);
    try {
      const apiResult = await identifyAndSearch(imageData.base64, imageData.mimeType, currentUser.location);
      setResult(apiResult);
      // Save to history
      const historyItem: SearchHistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          previewSrc: previewSrc!,
          result: apiResult,
      };
      const updatedUser = { ...currentUser, history: [historyItem, ...currentUser.history] };
      updateUser(updatedUser);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSearch = async () => {
    if (!textQuery.trim() || !currentUser) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setVisibleResultsCount(6);
    setPreviewSrc(null);
    setImageData(null);
    stopCamera();

    try {
      const apiResult = await searchWithText(textQuery, currentUser.location);
      setResult(apiResult);
      // NOTE: Text searches are not saved to history as history requires an image.
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setPreviewSrc(null);
    setImageData(null);
    setResult(null);
    setError(null);
    setTextQuery('');
    stopCamera();
    setVisibleResultsCount(6);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              Snap & Shop AI
            </h1>
            <p className="text-sm text-gray-400">Your visual shopping assistant.</p>
          </div>
          <div className="flex items-center gap-4">
             {currentUser ? (
                <>
                  <button onClick={() => setProfileModalOpen(true)} className="flex items-center gap-2 text-gray-300 hover:text-white">
                    {currentUser.profilePic ? (
                        <img src={currentUser.profilePic} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <Icon name="user" className="w-6 h-6" />
                        </div>
                    )}
                  </button>
                  <Button onClick={handleLogout} variant="secondary" icon={<Icon name="logout" />} />
                </>
             ) : (
                <Button onClick={() => setAuthModalOpen(true)} variant="primary">
                    Login / Sign Up
                </Button>
             )}
          </div>
        </header>

        <main className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border border-gray-700">
          <div className="space-y-6">
            <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center bg-gray-900 rounded-lg p-4 min-h-[300px] aspect-video">
              {!currentUser && (
                  <div className="absolute inset-0 bg-gray-900/80 z-10 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                      <p className="text-lg font-semibold text-gray-300 mb-4">Please log in to start searching</p>
                      <Button onClick={() => setAuthModalOpen(true)} variant="primary">Login / Sign Up</Button>
                  </div>
              )}
              <div className={!currentUser ? 'blur-md' : ''}>
                {isCameraOn ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full rounded-md object-cover" />
                ) : previewSrc ? (
                  <img src={previewSrc} alt="Preview" className="max-w-full max-h-full rounded-md object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-6 text-center">
                      <p className="text-lg font-medium text-gray-300">Start with an image</p>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                          <Button onClick={handleStartCamera} disabled={!currentUser} variant="secondary" icon={<Icon name="camera" />}>
                              Start Camera
                          </Button>
                          <Button onClick={() => fileInputRef.current?.click()} disabled={!currentUser} variant="secondary" icon={<Icon name="upload" />}>
                              Upload Image
                          </Button>
                      </div>

                      <div className="w-full max-w-sm">
                          <div className="relative my-4">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                  <div className="w-full border-t border-gray-700" />
                              </div>
                              <div className="relative flex justify-center">
                                  <span className="bg-gray-900 px-2 text-sm text-gray-400">OR</span>
                              </div>
                          </div>
                          
                          <p className="text-lg font-medium text-gray-300">Search by text</p>
                          <div className="mt-2 flex items-center gap-2">
                              <input 
                                  type="text"
                                  value={textQuery}
                                  onChange={(e) => setTextQuery(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !(!textQuery.trim() || isLoading || !currentUser)) handleTextSearch(); }}
                                  placeholder="e.g., 'red running shoes'"
                                  disabled={!currentUser}
                                  className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <Button onClick={handleTextSearch} disabled={!textQuery.trim() || isLoading || !currentUser} icon={<Icon name="search" />} variant="primary">
                                  Search
                              </Button>
                          </div>
                      </div>
                  </div>
                )}
              </div>
               <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 min-h-[44px]">
              {isCameraOn && (
                <Button onClick={handleTakePhoto} variant="primary" icon={<Icon name="capture" />}>
                  Take Photo
                </Button>
              )}
              {previewSrc && !isCameraOn && (
                <>
                  <Button onClick={handleSearch} disabled={!imageData || isLoading || !currentUser} icon={<Icon name="search" />}>
                    {isLoading ? 'Searching...' : 'Search Shops'}
                  </Button>
                  <Button onClick={handleStartCamera} variant="outline" icon={<Icon name="camera" />}>
                    Retake
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" icon={<Icon name="upload" />}>
                    Upload New
                  </Button>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          </div>
          
          <div className="mt-8">
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Spinner />
                <p className="mt-4 text-lg text-indigo-300">AI is identifying your item...</p>
              </div>
            )}
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {result && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                    <h3 className="text-xl font-semibold text-indigo-400">AI Results</h3>
                    <Button onClick={handleNewSearch} variant="outline">New Search</Button>
                 </div>
                 <div>
                    <h3 className="text-lg font-semibold text-indigo-400 mb-2">Identified Product</h3>
                    <p className="text-gray-300 bg-gray-900/50 p-4 rounded-lg">{result.identifiedProduct}</p>
                 </div>
                 <div>
                    <h3 className="text-lg font-semibold text-indigo-400 mb-4">Shopping Results</h3>
                    {result.searchResults.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {result.searchResults.slice(0, visibleResultsCount).map((item, index) => (
                                <a 
                                    href={item.link} 
                                    key={index}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-indigo-500/30 hover:ring-2 hover:ring-indigo-500 transition-all duration-300 flex flex-col group"
                                >
                                    <div className="relative w-full h-48 bg-gray-700">
                                        <img 
                                            src={item.imageUrl || 'https://via.placeholder.com/300x200.png?text=No+Image'} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x200.png?text=No+Image'; }}
                                        />
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors duration-200 flex-grow" title={item.title}>
                                            {item.title}
                                        </h4>
                                        <div className="mt-4 flex justify-between items-center">
                                            <p className="text-sm text-gray-400 truncate">{item.storeName || 'Online Store'}</p>
                                            {item.price && (
                                                <p className="text-lg font-bold text-indigo-400">{item.price}</p>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            ))}
                            </div>
                            {result.searchResults.length > visibleResultsCount && (
                                <div className="mt-8 text-center">
                                    <Button
                                        onClick={() => setVisibleResultsCount(prev => prev + 6)}
                                        variant="secondary"
                                    >
                                        Show More Results
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-400 bg-gray-900/50 p-4 rounded-lg">No online shopping results found for this item.</p>
                    )}
                 </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {isAuthModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onLoginSuccess={updateUser} />}
      {isProfileModalOpen && currentUser && (
        <ProfileModal 
            user={currentUser} 
            onClose={() => setProfileModalOpen(false)} 
            onLogout={handleLogout} 
            onUpdateProfilePic={handleUpdateProfilePic}
            onUpdateLocation={handleUpdateLocation}
        />
      )}
    </div>
  );
};

export default App;