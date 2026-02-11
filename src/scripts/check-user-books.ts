import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookStoreService } from '../modules/book-store/book-store.service';

async function checkUserBooks() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookStoreService = app.get(BookStoreService);

  const userId = '696de8d146b917eb63d15e78';

  console.log('\n🔍 Checking user books...');
  console.log('User ID:', userId);

  try {
    const books = await bookStoreService.getMyBooks(userId);
    console.log('\n📚 Books found:', books.length);

    if (books.length > 0) {
      books.forEach((item, index) => {
        console.log(`\n--- Book ${index + 1} ---`);
        console.log('Access ID:', item._id);
        console.log('Granted at:', item.granted_at);
        console.log('Book ID:', (item.book as any)?._id);
        console.log('Book Title:', (item.book as any)?.title);
        console.log('Files:', item.files?.length || 0);
      });
    } else {
      console.log('\n⚠️  No books found for this user');
      console.log('\n💡 Checking user_book_access collection...');

      // Direct query to check raw data
      const mongoose = require('mongoose');
      const db = mongoose.connection;
      const UserBookAccess = db.collection('user_book_access');

      const accesses = await UserBookAccess.find({
        user_id: new mongoose.Types.ObjectId(userId),
      }).toArray();

      console.log('Raw accesses found:', accesses.length);
      if (accesses.length > 0) {
        accesses.forEach((a, i) => {
          console.log(`\nAccess ${i + 1}:`, {
            _id: a._id,
            user_id: a.user_id,
            book_id: a.book_id,
            is_deleted: a.is_deleted,
            granted_at: a.granted_at,
          });
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  await app.close();
}

checkUserBooks();
