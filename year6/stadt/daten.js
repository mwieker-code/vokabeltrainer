/* =========================================================================
   TOWN RACE (Year 6, Unit 3 "Out and about") – Daten
   Orte der Stadt, Strassennamen, Ladenschilder und die Woerter fuer
   Wegbeschreibungen. Alles, was im Spiel steht, ist Englisch; "de" ist nur
   fuer die Wortliste ("Words").
   ========================================================================= */
window.STADT_DATEN={
 /* Orte, auf die sich Wegbeschreibungen beziehen.
    platz: 'ecke' = Eckgrundstueck an einer Kreuzung (fuer "Turn left at …"),
           'mitte' = Grundstueck mitten im Block (fuer "past …" und als Ziel). */
 ORTE:[
  {id:'church',en:'the church',schild:"ST MARY'S CHURCH",kurz:'CHURCH',de:'die Kirche',platz:'ecke',modell:'kirche',farbe:'#7D8A96'},
  {id:'post',en:'the post office',schild:'POST OFFICE',de:'die Post',platz:'ecke',modell:'laden',farbe:'#D7261E'},
  {id:'station',en:'the station',schild:'STATION',de:'der Bahnhof',platz:'ecke',modell:'bahnhof',farbe:'#21409A'},
  {id:'bank',en:'the bank',schild:'BANK',de:'die Bank',platz:'ecke',modell:'bank',farbe:'#1F5D4C'},
  {id:'supermarket',en:'the supermarket',schild:'HILLTOP MARKET',kurz:'SUPERMARKET',de:'der Supermarkt',platz:'ecke',modell:'markt',farbe:'#2E9E4F'},
  {id:'cafe',en:'the café',schild:'CAFÉ',de:'das Café',platz:'ecke',modell:'laden',farbe:'#8E5BA8',markise:['#8E5BA8','#FFFFFF']},
  {id:'library',en:'the library',schild:'LIBRARY',de:'die Bücherei',platz:'ecke',modell:'gross',farbe:'#7A4A2A'},
  {id:'cinema',en:'the cinema',schild:'CINEMA',de:'das Kino',platz:'ecke',modell:'kino',farbe:'#B0182A'},
  {id:'police',en:'the police station',schild:'POLICE',de:'die Polizeiwache',platz:'ecke',modell:'gross',farbe:'#1A3A8A'},
  {id:'fire',en:'the fire station',schild:'FIRE STATION',de:'die Feuerwache',platz:'ecke',modell:'feuer',farbe:'#C62828'},
  {id:'museum',en:'the museum',schild:'MUSEUM',de:'das Museum',platz:'ecke',modell:'bank',farbe:'#6D4C41'},
  {id:'school',en:'the school',schild:'HILLTOP SCHOOL',kurz:'SCHOOL',de:'die Schule',platz:'ecke',modell:'gross',farbe:'#0F3B2E'},
  {id:'pool',en:'the swimming pool',schild:'SWIMMING POOL',de:'das Schwimmbad',platz:'ecke',modell:'gross',farbe:'#0288D1'},
  {id:'hotel',en:'the hotel',schild:'HOTEL',de:'das Hotel',platz:'ecke',modell:'gross',farbe:'#5D2E8C'},
  {id:'petrol',en:'the petrol station',schild:'PETROL',de:'die Tankstelle',platz:'ecke',modell:'tanke',farbe:'#F9A825'},
  {id:'bakery',en:'the bakery',schild:'BAKERY',de:'die Bäckerei',platz:'mitte',modell:'laden',farbe:'#C8863E',markise:['#C8863E','#FFF3D6']},
  {id:'bookshop',en:'the bookshop',schild:'BOOKSHOP',de:'die Buchhandlung',platz:'mitte',modell:'laden',farbe:'#2C5F8A'},
  {id:'flowers',en:'the flower shop',schild:'FLOWERS',de:'der Blumenladen',platz:'mitte',modell:'laden',farbe:'#D81B60',markise:['#43A047','#FFFFFF']},
  {id:'toys',en:'the toy shop',schild:'TOY SHOP',de:'der Spielzeugladen',platz:'mitte',modell:'laden',farbe:'#F57C00',markise:['#F57C00','#FFE082']},
  {id:'sports',en:'the sports shop',schild:'SPORTS',de:'das Sportgeschäft',platz:'mitte',modell:'laden',farbe:'#00897B'},
  {id:'chemist',en:"the chemist's",schild:'CHEMIST',de:'die Drogerie / Apotheke',platz:'mitte',modell:'laden',farbe:'#00A651'},
  {id:'pizza',en:'the pizza place',schild:'PIZZA',de:'die Pizzeria',platz:'mitte',modell:'laden',farbe:'#E53935',markise:['#E53935','#FFFFFF']}
 ],
 /* Grosse Flaechen (zwei Bloecke ohne Strasse dazwischen) */
 FLAECHEN:[
  {id:'park',en:'the park',schild:'VICTORIA PARK',de:'der Park',modell:'park'},
  {id:'pitch',en:'the football pitch',schild:'FOOTBALL PITCH',de:'der Fußballplatz',modell:'platz'}
 ],
 STRASSEN:['High Street','Church Road','London Road','Station Road','Park Lane','Mill Lane','King Street','Queen Street','Bridge Street','Green Lane','Victoria Road','Castle Street','Hill Road','Oak Avenue'],
 /* Schilder an gewoehnlichen Laeden (keine Ziele, nur Stadtbild) */
 LAEDEN:['FISH & CHIPS','NEWSAGENT','HAIRDRESSER','CHARITY SHOP','SHOES','PET SHOP','GREENGROCER','LAUNDERETTE','KEBAB','PHONES','BUTCHER','GIFTS','OPTICIAN','ICE CREAM','TAILOR','DENTIST'],
 /* Wortliste ("Words") */
 WOERTER:[
  ['Excuse me, can you tell me the way to …?','Entschuldigung, können Sie mir den Weg zu … sagen?'],
  ['go straight on','geradeaus gehen / fahren'],
  ['turn left / right','links / rechts abbiegen'],
  ['turn around','umdrehen, wenden'],
  ['at the end of the road','am Ende der Straße'],
  ['take the second road on the left','die zweite Straße links nehmen'],
  ['into Church Road','in die Church Road (hinein)'],
  ['go past the church','an der Kirche vorbei'],
  ['just after the bank','kurz nach der Bank'],
  ['cross London Road','die London Road überqueren'],
  ['on the corner of … and …','an der Ecke … / …'],
  ['opposite the park','gegenüber dem Park'],
  ['on your left / right','auf der linken / rechten Seite'],
  ['the roundabout','der Kreisverkehr'],
  ['the traffic lights','die Ampel'],
  ['the pedestrian zone','die Fußgängerzone'],
  ['about two hundred metres','ungefähr zweihundert Meter'],
  ['the finish','das Ziel']
 ]
};
