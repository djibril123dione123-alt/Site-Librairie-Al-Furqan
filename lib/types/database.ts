/**
 * Types générés manuellement depuis le schéma Supabase.
 * À remplacer par des types auto-générés avec `supabase gen types typescript` une fois le projet connecté.
 *
 * Commande : npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'temporarily_unavailable' | 'restocked';
export type ImageType = 'cover' | 'back' | 'spine' | 'inside' | 'toc' | 'other';
export type AdminRole = 'admin' | 'viewer';

export interface Database {
  public: {
    Tables: {
      authors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          bio: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['authors']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['authors']['Insert']>;
      };
      publishers: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['publishers']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['publishers']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image: string | null;
          position: number;
          is_visible: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      themes: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: Omit<Database['public']['Tables']['themes']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['themes']['Insert']>;
      };
      audiences: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: Omit<Database['public']['Tables']['audiences']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['audiences']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          short_description: string | null;
          description: string | null;
          price: number | null;
          compare_at_price: number | null;
          currency: string;
          status: ProductStatus;
          availability: ProductAvailability;
          stock_quantity: number | null;
          language: string | null;
          isbn: string | null;
          pages: number | null;
          dimensions: string | null;
          binding: string | null;
          edition: string | null;
          publication_year: number | null;
          featured: boolean;
          new_arrival: boolean;
          restocked: boolean;
          has_variants: boolean;
          video_url: string | null;
          author_id: string | null;
          publisher_id: string | null;
          category_id: string | null;
          // Champs spécifiques Coran
          reading: string | null; // 'Hafs' | 'Warsh'
          tajwid: boolean | null;
          // Couleur (pour l'UI cover)
          color: string | null;
          ink: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_themes: {
        Row: {
          product_id: string;
          theme_id: string;
        };
        Insert: Database['public']['Tables']['product_themes']['Row'];
        Update: Partial<Database['public']['Tables']['product_themes']['Row']>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          price: number | null;
          stock_quantity: number | null;
          availability: ProductAvailability | null;
          attributes: Json; // { "lecture": "Warsh", "format": "Moyen", "couleur": "Bleu" }
          image_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          alt_text: string | null;
          position: number;
          type: ImageType;
        };
        Insert: Omit<Database['public']['Tables']['product_images']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          eyebrow: string | null;
          description: string | null;
          status: 'draft' | 'published';
          image: string | null;
          video_url: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['collections']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collections']['Insert']>;
      };
      collection_products: {
        Row: {
          collection_id: string;
          product_id: string;
          position: number;
        };
        Insert: Database['public']['Tables']['collection_products']['Row'];
        Update: Partial<Database['public']['Tables']['collection_products']['Row']>;
      };
      search_aliases: {
        Row: {
          id: string;
          alias: string;
          normalized_alias: string;
          canonical: string;
        };
        Insert: Omit<Database['public']['Tables']['search_aliases']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['search_aliases']['Insert']>;
      };
      search_events: {
        Row: {
          id: string;
          query: string;
          normalized_query: string;
          result_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['search_events']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['search_events']['Insert']>;
      };
      book_requests: {
        Row: {
          id: string;
          query: string;
          source: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['book_requests']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['book_requests']['Insert']>;
      };
      profiles: {
        Row: {
          id: string; // = auth.uid
          role: AdminRole;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
    };
  };
}
