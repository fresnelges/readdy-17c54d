export interface Formation {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  souscategorie: string;
  duree: string;
  prix: number;
  status: string;
}

export interface Chapter {
  id: number;
  id_formation: number;
  titre: string;
  description: string;
}

export interface Lesson {
  id: number;
  cours_id: number;
  chapitre_id: number;
  titre: string;
  contenu: string;
}

export interface CourseFile {
  id: number;
  cours_id: number;
  nom_fichier: string;
  path: string;
  type: string;
  taille: number;
  created_at: string;
}