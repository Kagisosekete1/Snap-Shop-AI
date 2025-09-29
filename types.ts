export interface SearchResultItem {
  title: string;
  link: string;
  imageUrl?: string;
  price?: string;
  storeName?: string;
}

export interface ApiResult {
  identifiedProduct: string;
  searchResults: SearchResultItem[];
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  previewSrc: string;
  result: ApiResult;
}

export interface User {
  email: string;
  profilePic?: string; // base64 string
  history: SearchHistoryItem[];
  location?: string;
}
