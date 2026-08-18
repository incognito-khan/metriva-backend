import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  console.log('Seeding database...');
  // Add seeding logic here in future tasks
  console.log('Seeding completed');

  await app.close();
}

seed();
