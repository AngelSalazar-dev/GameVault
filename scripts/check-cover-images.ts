import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check games in each category to see cover image values
  const categories = ['action', 'adventure', 'anime', 'building', 'horror', 'indie'];
  
  for (const genre of categories) {
    console.log(`\n=== ${genre.toUpperCase()} ===`);
    const games = await prisma.game.findMany({
      where: { 
        status: 'active', 
        genre,
        coverImage: { not: null }
      },
      take: 5,
      select: { 
        title: true, 
        slug: true, 
        coverImage: true 
      }
    });
    
    for (const game of games) {
      console.log(`${game.title}: ${game.coverImage?.substring(0, 80)}...`);
    }
  }
  
  // Check total counts
  const totalGames = await prisma.game.count({ where: { status: 'active' } });
  const gamesWithCovers = await prisma.game.count({ 
    where: { 
      status: 'active', 
      coverImage: { not: null } 
    } 
  });
  const gamesWithNullCovers = await prisma.game.count({ 
    where: { 
      status: 'active', 
      coverImage: null 
    } 
  });
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total active games: ${totalGames}`);
  console.log(`Games with cover images: ${gamesWithCovers}`);
  console.log(`Games with null covers: ${gamesWithNullCovers}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());