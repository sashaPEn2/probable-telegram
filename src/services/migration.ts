import { db } from '../lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { getPortalDB } from './storage';
import { PortalDatabase } from './storage';

export async function migrateLocalStorageToFirestore() {
  const dbData = getPortalDB();
  const batch = writeBatch(db);

  const collections: (keyof PortalDatabase)[] = [
    'users', 'publications', 'certificates', 'projects', 'snils', 'events', 
    'applications', 'news', 'tasks', 'gallery', 'notifications', 'reports', 
    'merch', 'orders', 'announcements', 'snil_applications', 'quizzes', 'quizAttempts'
  ];

  for (const collectionName of collections) {
    const dataArray = dbData[collectionName];
    if (Array.isArray(dataArray)) {
      for (const item of dataArray) {
        // Need to ensure each item has an 'id' or similar identifier for the doc
        const id = (item as any).id || (item as any).record_book_id || (item as any).userId || Date.now().toString();
        const docRef = doc(collection(db, collectionName), id);
        batch.set(docRef, item);
      }
    }
  }

  // Handle optional banners
  if (dbData.feed_banner) {
    batch.set(doc(db, 'global_config', 'feed_banner'), dbData.feed_banner);
  }
  if (dbData.secondary_banner) {
    batch.set(doc(db, 'global_config', 'secondary_banner'), dbData.secondary_banner);
  }

  await batch.commit();
  console.log('Migration to Firestore completed');
}
