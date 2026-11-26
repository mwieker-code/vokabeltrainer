/* =========================================================================
   DATEN fuer "Shopping Trip" (Year 6): Waren, Abteilungen, Budget-Auftraege
   und die Saetze an der Kasse. Preise in Pence, frei erfunden und nur
   ungefaehr an britischen Supermarktpreisen orientiert.
   Felder einer Ware:
     en     Mengenangabe im Singular ("a bottle of water")
     pl     Plural ohne Zahl ("bottles of water") fuer "two bottles of water"
     de     deutsche Bedeutung
     schild kurzer Name auf dem Preisschild
     p      Preis in Pence
     ort    Abteilung (siehe ORTE)
     form   Form fuer die 3D-Darstellung, farbe/akzent fuer Verpackung
     emo    Bild auf der Verpackung
     menge  true: darf auf der Liste mit Zahl stehen ("three apples")
   ========================================================================= */
window.SHOP_DATEN = {
 laden: 'Hilltop Market',
 adresse: '12 High Street · Hilltop',
 ORTE: {
  obst:        {en: 'Fruit',           de: 'Obst'},
  gemuese:     {en: 'Vegetables',      de: 'Gemüse'},
  baeckerei:   {en: 'Bakery',          de: 'Backwaren'},
  getraenke:   {en: 'Drinks',          de: 'Getränke'},
  fruehstueck: {en: 'Breakfast',       de: 'Frühstück'},
  snacks:      {en: 'Snacks & Sweets', de: 'Knabbereien und Süßes'},
  kochen:      {en: 'Pasta & Sauces',  de: 'Nudeln und Soßen'},
  dosen:       {en: 'Tins & Baking',   de: 'Konserven und Backzutaten'},
  haushalt:    {en: 'Home & Party',    de: 'Haushalt und Party'},
  pflege:      {en: 'Toiletries',      de: 'Körperpflege'},
  kuehl:       {en: 'Dairy & Meat',    de: 'Kühlregal'},
  tiefkuehl:   {en: 'Frozen Food',     de: 'Tiefkühlkost'}
 },
 WAREN: [
  /* Obst (Wand links) */
  {id:'apple',      en:'an apple',               pl:'apples',                 de:'ein Apfel',                       schild:'Apples',        p:30,  ort:'obst', form:'kugel',  farbe:'#D7372F', akzent:'#7DB343', emo:'🍎', menge:true},
  {id:'bananas',    en:'a bunch of bananas',     pl:'bunches of bananas',     de:'ein Bund Bananen',                schild:'Bananas',       p:95,  ort:'obst', form:'banane', farbe:'#F4D03F', akzent:'#6B8E23', emo:'🍌'},
  {id:'oranges',    en:'a bag of oranges',       pl:'bags of oranges',        de:'ein Beutel Orangen',              schild:'Oranges',       p:150, ort:'obst', form:'kugel',  farbe:'#F39C12', akzent:'#E67E22', emo:'🍊'},
  {id:'grapes',     en:'a bunch of grapes',      pl:'bunches of grapes',      de:'eine Weintraube',                 schild:'Grapes',        p:200, ort:'obst', form:'traube', farbe:'#7D3C98', akzent:'#A569BD', emo:'🍇'},
  {id:'strawberries',en:'a box of strawberries', pl:'boxes of strawberries',  de:'eine Schale Erdbeeren',           schild:'Strawberries',  p:225, ort:'obst', form:'schale', farbe:'#E74C3C', akzent:'#2ECC71', emo:'🍓'},
  {id:'lemon',      en:'a lemon',                pl:'lemons',                 de:'eine Zitrone',                    schild:'Lemons',        p:35,  ort:'obst', form:'zitrone',farbe:'#F7DC6F', akzent:'#D4AC0D', emo:'🍋', menge:true},
  /* Gemuese (Insel) */
  {id:'tomatoes',   en:'a kilo of tomatoes',     pl:'kilos of tomatoes',      de:'ein Kilo Tomaten',                schild:'Tomatoes',      p:190, ort:'gemuese', form:'kugel', farbe:'#E03B24', akzent:'#C0392B', emo:'🍅'},
  {id:'carrots',    en:'a bag of carrots',       pl:'bags of carrots',        de:'ein Beutel Karotten',             schild:'Carrots',       p:60,  ort:'gemuese', form:'karotte', farbe:'#EB7A23', akzent:'#3E8E41', emo:'🥕'},
  {id:'potatoes',   en:'a bag of potatoes',      pl:'bags of potatoes',       de:'ein Beutel Kartoffeln',           schild:'Potatoes',      p:145, ort:'gemuese', form:'kartoffel', farbe:'#B9895A', akzent:'#8E6B43', emo:'🥔'},
  {id:'cucumber',   en:'a cucumber',             pl:'cucumbers',              de:'eine Gurke',                      schild:'Cucumbers',     p:70,  ort:'gemuese', form:'gurke', farbe:'#2E7D32', akzent:'#66BB6A', emo:'🥒', menge:true},
  {id:'lettuce',    en:'a lettuce',              pl:'lettuces',               de:'ein Salatkopf',                   schild:'Lettuce',       p:65,  ort:'gemuese', form:'salat', farbe:'#7CB342', akzent:'#AED581', emo:'🥬'},
  /* Backwaren */
  {id:'bread',      en:'a loaf of bread',        pl:'loaves of bread',        de:'ein Laib Brot',                   schild:'Bread',         p:125, ort:'baeckerei', form:'brot', farbe:'#C68642', akzent:'#8D5524', emo:'🍞'},
  {id:'roll',       en:'a bread roll',           pl:'bread rolls',            de:'ein Brötchen',                    schild:'Bread rolls',   p:20,  ort:'baeckerei', form:'broetchen', farbe:'#D9A066', akzent:'#B07A3E', emo:'🥖', menge:true},
  {id:'cake',       en:'a cake',                 pl:'cakes',                  de:'ein Kuchen',                      schild:'Cakes',         p:450, ort:'baeckerei', form:'kuchen', farbe:'#FBEFF5', akzent:'#E84F7B', emo:'🎂'},
  {id:'doughnut',   en:'a doughnut',             pl:'doughnuts',              de:'ein Donut',                       schild:'Doughnuts',     p:55,  ort:'baeckerei', form:'donut', farbe:'#D9A066', akzent:'#F06292', emo:'🍩', menge:true},
  {id:'croissant',  en:'a croissant',            pl:'croissants',             de:'ein Croissant',                   schild:'Croissants',    p:60,  ort:'baeckerei', form:'croissant', farbe:'#E0A54A', akzent:'#B9772A', emo:'🥐', menge:true},
  /* Getraenke */
  {id:'water',      en:'a bottle of water',      pl:'bottles of water',       de:'eine Flasche Wasser',             schild:'Water',         p:65,  ort:'getraenke', form:'flasche', farbe:'#9AD3F5', akzent:'#1F6FB2', emo:'💧', menge:true},
  {id:'lemonade',   en:'a bottle of lemonade',   pl:'bottles of lemonade',    de:'eine Flasche Limonade',           schild:'Lemonade',      p:110, ort:'getraenke', form:'flasche', farbe:'#F4F1A5', akzent:'#2E9E4F', emo:'🍋', menge:true},
  {id:'cola',       en:'a can of cola',          pl:'cans of cola',           de:'eine Dose Cola',                  schild:'Cola',          p:80,  ort:'getraenke', form:'dose', farbe:'#C0392B', akzent:'#FFFFFF', emo:'🥤', menge:true},
  {id:'applejuice', en:'a carton of apple juice',pl:'cartons of apple juice', de:'ein Karton Apfelsaft',             schild:'Apple juice',   p:125, ort:'getraenke', form:'karton', farbe:'#8BC34A', akzent:'#F1C40F', emo:'🍏'},
  {id:'orangejuice',en:'a carton of orange juice',pl:'cartons of orange juice',de:'ein Karton Orangensaft',         schild:'Orange juice',  p:140, ort:'getraenke', form:'karton', farbe:'#FF9800', akzent:'#FFF3E0', emo:'🍊'},
  /* Fruehstueck */
  {id:'cornflakes', en:'a box of cornflakes',    pl:'boxes of cornflakes',    de:'eine Packung Cornflakes',         schild:'Cornflakes',    p:195, ort:'fruehstueck', form:'muesli', farbe:'#F5B041', akzent:'#C0392B', emo:'🥣'},
  {id:'tea',        en:'a box of tea',           pl:'boxes of tea',           de:'eine Packung Tee',                schild:'Tea',           p:220, ort:'fruehstueck', form:'teebox', farbe:'#1E8449', akzent:'#F4D03F', emo:'🫖'},
  {id:'coffee',     en:'a jar of coffee',        pl:'jars of coffee',         de:'ein Glas Kaffee',                 schild:'Coffee',        p:350, ort:'fruehstueck', form:'glas', farbe:'#5D4037', akzent:'#D7CCC8', emo:'☕'},
  {id:'jam',        en:'a jar of jam',           pl:'jars of jam',            de:'ein Glas Marmelade',              schild:'Jam',           p:150, ort:'fruehstueck', form:'glas', farbe:'#B71C1C', akzent:'#F5F5F5', emo:'🍓'},
  {id:'honey',      en:'a jar of honey',         pl:'jars of honey',          de:'ein Glas Honig',                  schild:'Honey',         p:275, ort:'fruehstueck', form:'glas', farbe:'#F0A30A', akzent:'#6D4C41', emo:'🍯'},
  /* Snacks */
  {id:'crisps',     en:'a packet of crisps',     pl:'packets of crisps',      de:'eine Tüte Chips',                 schild:'Crisps',        p:90,  ort:'snacks', form:'tuete', farbe:'#F1C40F', akzent:'#E74C3C', emo:'🥔', menge:true},
  {id:'biscuits',   en:'a packet of biscuits',   pl:'packets of biscuits',    de:'eine Packung Kekse',              schild:'Biscuits',      p:115, ort:'snacks', form:'keksrolle', farbe:'#2471A3', akzent:'#D4A373', emo:'🍪'},
  {id:'chocolate',  en:'a bar of chocolate',     pl:'bars of chocolate',      de:'eine Tafel Schokolade',           schild:'Chocolate',     p:135, ort:'snacks', form:'tafel', farbe:'#6C3483', akzent:'#5D4037', emo:'🍫', menge:true},
  {id:'sweets',     en:'a bag of sweets',        pl:'bags of sweets',         de:'eine Tüte Süßigkeiten',           schild:'Sweets',        p:100, ort:'snacks', form:'tuete', farbe:'#EC407A', akzent:'#FFEB3B', emo:'🍬'},
  {id:'popcorn',    en:'a bag of popcorn',       pl:'bags of popcorn',        de:'eine Tüte Popcorn',               schild:'Popcorn',       p:120, ort:'snacks', form:'tuete', farbe:'#E53935', akzent:'#FFFFFF', emo:'🍿'},
  /* Nudeln und Sossen */
  {id:'spaghetti',  en:'a packet of spaghetti',  pl:'packets of spaghetti',   de:'eine Packung Spaghetti',          schild:'Spaghetti',     p:85,  ort:'kochen', form:'nudeln', farbe:'#1A5276', akzent:'#F9E79F', emo:'🍝'},
  {id:'rice',       en:'a bag of rice',          pl:'bags of rice',           de:'eine Tüte Reis',                  schild:'Rice',          p:140, ort:'kochen', form:'sack', farbe:'#F8F9F9', akzent:'#D35400', emo:'🍚'},
  {id:'pastasauce', en:'a jar of pasta sauce',   pl:'jars of pasta sauce',    de:'ein Glas Nudelsoße',              schild:'Pasta sauce',   p:160, ort:'kochen', form:'glas', farbe:'#C0392B', akzent:'#27AE60', emo:'🍅'},
  {id:'tintomatoes',en:'a tin of tomatoes',      pl:'tins of tomatoes',       de:'eine Dose Tomaten',               schild:'Tinned tomatoes',p:55, ort:'kochen', form:'konserve', farbe:'#E74C3C', akzent:'#27AE60', emo:'🍅', menge:true},
  {id:'ketchup',    en:'a bottle of ketchup',    pl:'bottles of ketchup',     de:'eine Flasche Ketchup',            schild:'Ketchup',       p:175, ort:'kochen', form:'ketchup', farbe:'#C62828', akzent:'#FFFFFF', emo:'🍅'},
  /* Konserven und Backzutaten */
  {id:'beans',      en:'a tin of baked beans',   pl:'tins of baked beans',    de:'eine Dose Baked Beans (weiße Bohnen in Tomatensoße)', schild:'Baked beans', p:75, ort:'dosen', form:'konserve', farbe:'#1565C0', akzent:'#FF7043', emo:'🥫', menge:true},
  {id:'soup',       en:'a tin of soup',          pl:'tins of soup',           de:'eine Dose Suppe',                 schild:'Soup',          p:95,  ort:'dosen', form:'konserve', farbe:'#F57F17', akzent:'#FFFDE7', emo:'🥣', menge:true},
  {id:'tuna',       en:'a tin of tuna',          pl:'tins of tuna',           de:'eine Dose Thunfisch',             schild:'Tuna',          p:110, ort:'dosen', form:'flachdose', farbe:'#0097A7', akzent:'#E0F7FA', emo:'🐟', menge:true},
  {id:'flour',      en:'a bag of flour',         pl:'bags of flour',          de:'eine Tüte Mehl',                  schild:'Flour',         p:95,  ort:'dosen', form:'mehl', farbe:'#FDFEFE', akzent:'#2E86C1', emo:'🌾'},
  {id:'sugar',      en:'a bag of sugar',         pl:'bags of sugar',          de:'eine Tüte Zucker',                schild:'Sugar',         p:110, ort:'dosen', form:'mehl', farbe:'#FDFEFE', akzent:'#E91E63', emo:'🧊'},
  /* Haushalt und Party */
  {id:'toiletrolls',en:'a pack of toilet rolls', pl:'packs of toilet rolls',  de:'eine Packung Toilettenpapier',    schild:'Toilet rolls',  p:350, ort:'haushalt', form:'klopapier', farbe:'#FFFFFF', akzent:'#5DADE2', emo:'🧻'},
  {id:'washingup',  en:'a bottle of washing-up liquid', pl:'bottles of washing-up liquid', de:'eine Flasche Spülmittel', schild:'Washing-up liquid', p:120, ort:'haushalt', form:'spueli', farbe:'#43A047', akzent:'#FFEB3B', emo:'🧽'},
  {id:'batteries',  en:'a packet of batteries',  pl:'packets of batteries',   de:'eine Packung Batterien',          schild:'Batteries',     p:400, ort:'haushalt', form:'karte', farbe:'#212121', akzent:'#FFB300', emo:'🔋'},
  {id:'candles',    en:'a packet of birthday candles', pl:'packets of birthday candles', de:'eine Packung Geburtstagskerzen', schild:'Birthday candles', p:150, ort:'haushalt', form:'karte', farbe:'#8E24AA', akzent:'#FFD54F', emo:'🕯️'},
  {id:'balloons',   en:'a packet of balloons',   pl:'packets of balloons',    de:'eine Packung Luftballons',        schild:'Balloons',      p:200, ort:'haushalt', form:'karte', farbe:'#00ACC1', akzent:'#FF4081', emo:'🎈'},
  /* Koerperpflege */
  {id:'toothpaste', en:'a tube of toothpaste',   pl:'tubes of toothpaste',    de:'eine Tube Zahnpasta',             schild:'Toothpaste',    p:150, ort:'pflege', form:'tube', farbe:'#FFFFFF', akzent:'#1E88E5', emo:'🦷'},
  {id:'toothbrush', en:'a toothbrush',           pl:'toothbrushes',           de:'eine Zahnbürste',                 schild:'Toothbrushes',  p:175, ort:'pflege', form:'karte', farbe:'#E3F2FD', akzent:'#43A047', emo:'🪥', menge:true},
  {id:'soap',       en:'a bar of soap',          pl:'bars of soap',           de:'ein Stück Seife',                 schild:'Soap',          p:85,  ort:'pflege', form:'seife', farbe:'#F8BBD0', akzent:'#AD1457', emo:'🧼', menge:true},
  {id:'shampoo',    en:'a bottle of shampoo',    pl:'bottles of shampoo',     de:'eine Flasche Shampoo',            schild:'Shampoo',       p:250, ort:'pflege', form:'shampoo', farbe:'#7E57C2', akzent:'#FFFFFF', emo:'🧴'},
  {id:'showergel',  en:'a bottle of shower gel', pl:'bottles of shower gel',  de:'eine Flasche Duschgel',           schild:'Shower gel',    p:180, ort:'pflege', form:'shampoo', farbe:'#26A69A', akzent:'#FFFFFF', emo:'🚿'},
  /* Kuehlregal */
  {id:'milk',       en:'a bottle of milk',       pl:'bottles of milk',        de:'eine Flasche Milch',                schild:'Milk',          p:95,  ort:'kuehl', form:'milch', farbe:'#FFFFFF', akzent:'#1976D2', emo:'🥛', menge:true},
  {id:'butter',     en:'a pack of butter',       pl:'packs of butter',        de:'ein Stück Butter',                schild:'Butter',        p:210, ort:'kuehl', form:'butter', farbe:'#FFF59D', akzent:'#F9A825', emo:'🧈'},
  {id:'cheese',     en:'a piece of cheese',      pl:'pieces of cheese',       de:'ein Stück Käse',                  schild:'Cheese',        p:250, ort:'kuehl', form:'kaese', farbe:'#FFD54F', akzent:'#FFB300', emo:'🧀'},
  {id:'yoghurt',    en:'a pot of yoghurt',       pl:'pots of yoghurt',        de:'ein Becher Joghurt',              schild:'Yoghurt',       p:45,  ort:'kuehl', form:'becher', farbe:'#FFFFFF', akzent:'#E91E63', emo:'🍓', menge:true},
  {id:'eggs',       en:'a box of eggs',          pl:'boxes of eggs',          de:'eine Packung Eier (6 Stück)',     schild:'Eggs',          p:190, ort:'kuehl', form:'eier', farbe:'#BCAAA4', akzent:'#FFF8E1', emo:'🥚'},
  {id:'ham',        en:'a packet of ham',        pl:'packets of ham',         de:'eine Packung Schinken',           schild:'Ham',           p:200, ort:'kuehl', form:'flach', farbe:'#F48FB1', akzent:'#FFFFFF', emo:'🥓'},
  {id:'sausages',   en:'a packet of sausages',   pl:'packets of sausages',    de:'eine Packung Würstchen',          schild:'Sausages',      p:250, ort:'kuehl', form:'flach', farbe:'#A1887F', akzent:'#FFFFFF', emo:'🌭'},
  /* Tiefkuehlkost */
  {id:'icecream',   en:'a tub of ice cream',     pl:'tubs of ice cream',      de:'eine Packung Eis',                schild:'Ice cream',     p:300, ort:'tiefkuehl', form:'eisbox', farbe:'#F8BBD0', akzent:'#6D4C41', emo:'🍨'},
  {id:'pizza',      en:'a frozen pizza',         pl:'frozen pizzas',          de:'eine Tiefkühlpizza',              schild:'Pizza',         p:275, ort:'tiefkuehl', form:'pizza', farbe:'#1E88E5', akzent:'#FFC107', emo:'🍕', menge:true},
  {id:'fishfingers',en:'a box of fish fingers',  pl:'boxes of fish fingers',  de:'eine Packung Fischstäbchen',      schild:'Fish fingers',  p:250, ort:'tiefkuehl', form:'pizza', farbe:'#0D47A1', akzent:'#FFB74D', emo:'🐟'},
  {id:'peas',       en:'a bag of frozen peas',   pl:'bags of frozen peas',    de:'eine Tüte TK-Erbsen',             schild:'Frozen peas',   p:120, ort:'tiefkuehl', form:'tuete', farbe:'#43A047', akzent:'#E8F5E9', emo:'🌱'},
  {id:'chips',      en:'a bag of oven chips',    pl:'bags of oven chips',     de:'eine Tüte Ofen-Pommes',           schild:'Oven chips',    p:175, ort:'tiefkuehl', form:'tuete', farbe:'#D32F2F', akzent:'#FFD54F', emo:'🍟'}
 ],

 /* Budget-Auftraege: jede Gruppe nennt, was man aussuchen darf. */
 BUDGET: [
  {id:'picnic', titel:'A picnic in the park', de:'Ein Picknick im Park', budget:800, gruppen:[
   {en:'something to drink', de:'etwas zu trinken', aus:['water','lemonade','cola','applejuice','orangejuice']},
   {en:'some fruit',         de:'Obst',             aus:['apple','bananas','oranges','grapes','strawberries']},
   {en:'some bread',         de:'Brot',             aus:['bread','roll']},
   {en:'something for your sandwiches', de:'etwas für die Brote', aus:['cheese','ham','jam','honey','butter']},
   {en:'a snack',            de:'einen Snack',      aus:['crisps','biscuits','chocolate','sweets','popcorn']}]},
  {id:'pancakes', titel:'Pancake Day', de:'Pfannkuchentag', budget:600, gruppen:[
   {en:'flour', de:'Mehl', aus:['flour']},
   {en:'eggs',  de:'Eier', aus:['eggs']},
   {en:'milk',  de:'Milch', aus:['milk']},
   {en:'something to put on your pancakes', de:'etwas für auf die Pfannkuchen', aus:['lemon','sugar','jam','honey','strawberries','chocolate']}]},
  {id:'party', titel:'A birthday party', de:'Eine Geburtstagsfeier', budget:1500, gruppen:[
   {en:'a birthday cake',    de:'einen Kuchen',       aus:['cake']},
   {en:'birthday candles',   de:'Geburtstagskerzen',  aus:['candles']},
   {en:'balloons',           de:'Luftballons',        aus:['balloons']},
   {en:'two drinks',         de:'zwei Getränke',      aus:['water','lemonade','cola','applejuice','orangejuice'], n:2},
   {en:'two snacks',         de:'zwei Snacks',        aus:['crisps','biscuits','chocolate','sweets','popcorn'], n:2}]},
  {id:'breakfast', titel:'Breakfast for the family', de:'Frühstück für die Familie', budget:1000, gruppen:[
   {en:'something to eat',   de:'etwas zu essen',     aus:['cornflakes','bread','roll','croissant']},
   {en:'something to drink', de:'etwas zu trinken',   aus:['milk','applejuice','orangejuice','tea','coffee']},
   {en:'something to put on your bread', de:'etwas aufs Brot', aus:['butter','jam','honey','cheese']},
   {en:'some fruit',         de:'Obst',               aus:['apple','bananas','oranges','grapes','strawberries']}]},
  {id:'film', titel:'Film night with friends', de:'Filmabend mit Freunden', budget:900, gruppen:[
   {en:'a frozen pizza',     de:'eine Tiefkühlpizza', aus:['pizza']},
   {en:'two drinks',         de:'zwei Getränke',      aus:['water','lemonade','cola'], n:2},
   {en:'two snacks',         de:'zwei Snacks',        aus:['crisps','sweets','popcorn','chocolate'], n:2}]}
 ],

 /* Kasse. Je Schritt mehrere Fassungen; die erste Antwort ist richtig,
    das Spiel mischt die Reihenfolge. "warum" erklaert die richtige Antwort. */
 KASSE: {
  gruss: [
   {sagt:'Hello! How are you today?', ant:['Fine, thanks. And you?','I\'m eleven years old.','Yes, I am.'], warum:'When someone asks „How are you?“, you say „Fine, thanks.“'},
   {sagt:'Hi there! Did you find everything?', ant:['Yes, thanks.','Yes, I found it everything.','No, I am fine.'], warum:'Short and polite: „Yes, thanks.“'}
  ],
  tuete: [
   {sagt:'Do you need a bag?', ant:['Yes, please.','Yes, I need.','Yes, you\'re welcome.'], warum:'When you want something, you say „Yes, please.“'},
   {sagt:'Would you like a bag?', ant:['No, thanks. I\'ve got one.','No, I don\'t like.','No, please.'], warum:'When you don\'t want something, you say „No, thanks.“ – not „No, please.“'}
  ],
  frage: [
   {de:'You want to know the price of the chewing gum. What do you ask?', sagt:'', ant:['How much is the chewing gum?','How many is the chewing gum?','How much costs the chewing gum?'], antwort:'It\'s 60p.', warum:'You ask for the price with „How much is …?“'},
   {de:'You want to know the price of the lollies. What do you ask?', sagt:'', ant:['How much are the lollies?','How much is the lollies?','What cost the lollies?'], antwort:'They\'re 25p each.', warum:'For more than one thing (plural): „How much are …?“'},
   {de:'You want to know the price of the magazine. What do you ask?', sagt:'', ant:['How much is the magazine?','How much are the magazine?','How many costs the magazine?'], antwort:'It\'s £3.50.', warum:'For one thing (singular): „How much is …?“'}
  ],
  zahlen: [
   {sagt:'That\'s {SUMME}, please.', ant:['Here you are.','Here are you.','There you are it.'], warum:'When you give something to someone: „Here you are.“'}
  ],
  bon: [
   {sagt:'Would you like your receipt?', ant:['Yes, please.','Yes, I like.','Yes, thank you please.'], warum:'„Yes, please.“ – short and polite.'}
  ],
  tschuess: [
   {sagt:'Thank you. Have a nice day!', ant:['Thanks, you too. Bye!','Yes, I have.','Good night, have it.'], warum:'You wish the same back: „You too.“'},
   {sagt:'Thanks a lot. See you soon!', ant:['Bye! See you!','Yes, I see you.','Thanks, me too soon.'], warum:'To say goodbye: „Bye! See you!“'}
  ]
 },

 /* Geldbeutel: Scheine und Muenzen in Pence */
 GELD: [1000, 500, 200, 200, 100, 100, 50, 20, 20, 10, 5, 2, 2, 1],

 /* Recipe mission: Das Rezept nennt die Zutaten nur im Text.
    zutaten: [Waren-id, Wort im Text zum Hervorheben] */
 REZEPTE: [
  {id:'pancakes', titel:'Pancakes', emo:'🥞', de:'Pfannkuchen',
   text:'Put the flour in a bowl. Add two eggs and the milk and mix it all. Cook the pancakes in a hot pan. Then put some sugar and lemon juice on top.',
   zutaten:[['flour','flour'],['eggs','eggs'],['milk','milk'],['sugar','sugar'],['lemon','lemon']]},
  {id:'fruitsalad', titel:'Fruit salad', emo:'🥗', de:'Obstsalat',
   text:'Cut the apples, the bananas and the oranges into small pieces. Add some grapes. Put a pot of yoghurt on top.',
   zutaten:[['apple','apples'],['bananas','bananas'],['oranges','oranges'],['grapes','grapes'],['yoghurt','yoghurt']]},
  {id:'sandwich', titel:'Cheese and ham sandwich', emo:'🥪', de:'Sandwich mit Käse und Schinken',
   text:'Put butter on two slices of bread. Add a piece of cheese and some ham. Then add a few slices of tomato and a lettuce leaf.',
   zutaten:[['bread','bread'],['butter','butter'],['cheese','cheese'],['ham','ham'],['tomatoes','tomato'],['lettuce','lettuce']]},
  {id:'spaghetti', titel:'Spaghetti with tomato sauce', emo:'🍝', de:'Spaghetti mit Tomatensoße',
   text:'Cook the spaghetti in hot water for ten minutes. Heat a tin of tomatoes and a jar of pasta sauce in a pan. Put the sauce on the spaghetti and add some cheese.',
   zutaten:[['spaghetti','spaghetti'],['tintomatoes','tin of tomatoes'],['pastasauce','pasta sauce'],['cheese','cheese']]},
  {id:'potato', titel:'Baked potatoes', emo:'🥔', de:'Ofenkartoffeln',
   text:'Bake the potatoes in the oven for one hour. Heat the baked beans in a pan. Put some butter, the beans and some cheese on the hot potatoes.',
   zutaten:[['potatoes','potatoes'],['beans','baked beans'],['butter','butter'],['cheese','cheese']]},
  {id:'fryup', titel:'English breakfast', emo:'🍳', de:'Englisches Frühstück',
   text:'Fry the sausages and the eggs. Heat the baked beans and cut some tomatoes. Make toast with the bread. And drink a nice cup of tea!',
   zutaten:[['sausages','sausages'],['eggs','eggs'],['beans','baked beans'],['tomatoes','tomatoes'],['bread','bread'],['tea','tea']]}
 ],

 /* Where is ...? Kundinnen und Kunden, die etwas suchen */
 KUNDEN: [
  {name:'Mrs Brown', emo:'👵', sie:'her'},{name:'Mr Patel', emo:'👨🏽', sie:'him'},{name:'Lucy', emo:'👧', sie:'her'},
  {name:'Mr Green', emo:'👴', sie:'him'},{name:'Tom', emo:'👦', sie:'him'},{name:'Mrs Okafor', emo:'👩🏿', sie:'her'}
 ],

 /* Customer service (Team duel): Kundschaft mit einem Anliegen. aus = alle
    Waren, die passen. Das Anliegen nennt die Ware nie beim Namen. */
 WUENSCHE: [
  {wer:'👵',name:'Mrs Brown',  sagt:'I want to make a sandwich. I\'ve got bread. What can I put on it?', aus:['cheese','ham','butter','jam','honey']},
  {wer:'👨🏽',name:'Mr Patel',  sagt:'My kitchen is dirty. I need to wash all the plates and cups.',       aus:['washingup']},
  {wer:'👩🏿',name:'Mrs Okafor',sagt:'It\'s my son\'s birthday tomorrow! What do I need for the party?', aus:['cake','candles','balloons']},
  {wer:'👦',name:'Tom',        sagt:'I\'m really thirsty. I want something cold and fizzy.',            aus:['cola','lemonade']},
  {wer:'👧',name:'Lucy',       sagt:'I want to clean my teeth before bed.',                               aus:['toothpaste','toothbrush']},
  {wer:'👴',name:'Mr Green',   sagt:'We want to watch a film tonight. We need something to eat on the sofa.', aus:['popcorn','crisps','sweets','chocolate']},
  {wer:'👩🏼',name:'Ms Wood',   sagt:'My torch doesn\'t work any more. What do I need?',                  aus:['batteries']},
  {wer:'👱🏽',name:'Sam',        sagt:'I want to wash my hair after swimming.',                             aus:['shampoo','showergel']},
  {wer:'👦🏿',name:'Josh',       sagt:'It\'s a really hot day. I want something sweet and very cold.',     aus:['icecream']},
  {wer:'👩',name:'Mrs Taylor', sagt:'I want to bake bread at home. What do I need first?',                aus:['flour']},
  {wer:'👧🏻',name:'Emma',       sagt:'My rabbit is hungry. It loves orange vegetables.',                   aus:['carrots']},
  {wer:'👨',name:'Mr Hall',    sagt:'Monkeys love this yellow fruit. I want some for my lunch box.',      aus:['bananas']},
  {wer:'👩🏾',name:'Mrs Ahmed', sagt:'I want to make a fruit salad. What can I put in it?',               aus:['apple','bananas','oranges','grapes','strawberries']},
  {wer:'👨🏼',name:'Mr King',    sagt:'I want fish for dinner, but quick and from the freezer, please.',   aus:['fishfingers']},
  {wer:'🧓',name:'Mr Evans',   sagt:'Oh no! There\'s no paper left in the bathroom!',                     aus:['toiletrolls']},
  {wer:'👩🏻',name:'Ms Lee',    sagt:'I\'m cooking spaghetti tonight. What can I make the sauce with?',    aus:['pastasauce','tintomatoes']},
  {wer:'👦🏽',name:'Leo',        sagt:'I need something from a chicken to make pancakes.',                  aus:['eggs']},
  {wer:'👵🏿',name:'Mrs Clark', sagt:'I want a hot drink in the morning, please. Not milk!',              aus:['tea','coffee']},
  {wer:'👨🏾',name:'Mr Scott',  sagt:'My hands are dirty after the garden. What do I need?',              aus:['soap']},
  {wer:'👧🏼',name:'Mia',        sagt:'I want a green vegetable for my salad. It\'s long and thin.',        aus:['cucumber']}
 ],

 /* Lautsprecherdurchsagen im Laden (gesprochen und als Meldung) */
 DURCHSAGEN: [
  'Attention, shoppers! Today, strawberries are only two pounds twenty-five.',
  'Good morning, everyone! Fresh bread is now available at the bakery.',
  'Attention, please! Checkout one is now open.',
  'Dear customers, please don\'t forget your shopping bags!',
  'Special offer in aisle two: crisps and popcorn!',
  'Hello, shoppers! The ice cream in aisle four is very cold today. Enjoy!',
  'Lost and found: a small blue teddy bear is waiting at checkout one.'
 ],

 /* Glossar fuer den Knopf "Wörter" */
 WOERTER: [
  ['a bottle of …','eine Flasche …'],['a carton of …','ein Karton (Tetrapak) …'],['a can / a tin of …','eine Dose …'],
  ['a jar of …','ein Glas …'],['a packet / a pack of …','eine Packung …'],['a bag of …','eine Tüte / ein Beutel …'],
  ['a box of …','eine Schachtel / Packung …'],['a bar of …','eine Tafel / ein Stück …'],['a loaf of bread','ein Laib Brot'],
  ['a bunch of …','ein Bund / eine Traube …'],['a kilo of …','ein Kilo …'],['a tube of …','eine Tube …'],
  ['a pot / a tub of …','ein Becher …'],['a piece of …','ein Stück …'],['How much is / are …?','Was kostet / kosten …?'],
  ['cheap – cheaper – the cheapest','billig – billiger – am billigsten'],['expensive – more expensive','teuer – teurer'],
  ['the change','das Wechselgeld'],['the receipt','der Kassenbon'],['the checkout / the till','die Kasse'],
  ['aisle','der Gang im Supermarkt'],['next to …','neben …'],['between … and …','zwischen … und …'],['on the left / right','links / rechts'],['at the back','hinten'],['the cheapest / the most expensive','am billigsten / am teuersten'],['more expensive than','teurer als'],['basket / trolley','Korb / Einkaufswagen']
 ]
};
