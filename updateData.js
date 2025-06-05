import fs from "fs";

const games = JSON.parse(fs.readFileSync('gamesFixed.json', 'utf-8'));

const updatedGames = games.map((game, index) => {
  return { ...game, id: index + 1 };
});
// const UpdateRating=games.map((game,index)=>{
//     return {...game, rating:parseInt(game.rating)}
// })

// function convertDate(dateUTC){
//     let date=new Date(dateUTC*1000)
//     return date.getFullYear()
// }
// const updateDateRelease=games.map((game)=>{
//     return {...game,release_date:convertDate(game.release_date)}
// })
// const updatedLen=games.filter(game=>game.summary.length<=1000)
fs.writeFileSync('gamesFixed.json', JSON.stringify(updatedGames, null, 2));
console.log('✅ Game date updated.');