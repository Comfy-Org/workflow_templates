import { slugify } from './slugify';

export const categoryPath = (type: string) => `/templates/category/${type}/`;
export const modelPath = (name: string) => `/templates/model/${name}/`;
export const tagPath = (tag: string) => `/templates/tag/${slugify(tag)}/`;
export const thumbnailPath = (asset: string) => `/templates/thumbnails/${asset}`;
