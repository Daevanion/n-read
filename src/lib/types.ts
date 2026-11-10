export type GalleryTitle = {
  english: string;
  japanese: string | null;
  pretty: string;
};

export type CoverInfo = {
  path: string;
  width: number;
  height: number;
};

export type PageInfo = {
  number: number;
  path: string;
  width: number;
  height: number;
  thumbnail: string;
  thumbnail_width: number;
  thumbnail_height: number;
};

export type Tag = {
  id: number;
  type: string;
  name: string;
  slug: string;
  url: string;
  count: number;
  description?: string | null;
};

export type CatalogSource = "nhentai" | "hitomi";

export type GalleryListItem = {
  id: number;
  source?: CatalogSource;
  media_id: string;
  english_title: string;
  japanese_title: string | null;
  thumbnail: string;
  thumbnail_width: number;
  thumbnail_height: number;
  num_pages?: number;
  num_favorites?: number;
  tag_ids?: number[];
  blacklisted?: boolean;
};

export type GalleryDetail = {
  id: number;
  source?: CatalogSource;
  media_id: string;
  title: GalleryTitle;
  cover: CoverInfo;
  thumbnail: CoverInfo;
  scanlator?: string;
  upload_date: number;
  tags: Tag[];
  num_pages: number;
  num_favorites: number;
  pages: PageInfo[];
  related?: GalleryListItem[] | null;
};

export type PaginatedGalleries = {
  result: GalleryListItem[];
  num_pages: number;
  per_page?: number;
  total?: number | null;
};

export type CdnConfig = {
  image_servers: string[];
  thumb_servers: string[];
};

export type SortOption =
  | "date"
  | "popular"
  | "popular-today"
  | "popular-week"
  | "popular-month";

export type HistoryEntry = {
  id: number;
  source?: CatalogSource;
  title: string;
  thumbnail: string;
  page: number;
  pages: number;
  readAt: number;
};
