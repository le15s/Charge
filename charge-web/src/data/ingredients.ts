/**
 * The ingredient vocabulary used by the recipe finder, the world-foods list and food search in 8 languages.
 * Values are approximate, per 100 g of the ingredient as it is used in recipes (dry rice and pasta are dry weight).
 * Row: id|category|kcal|protein|carbs|fat|gramsPerPiece|flags|en|fr|es|ar|de|it|pt|tr   ("/" separates synonyms)
 * flags: m meat, f fish, b shellfish, k pork, d dairy, e egg, g gluten, n nuts or peanuts, a alcohol, h honey or gelatin,
 *        s staple (always assumed: salt, pepper, water), p pantry basic (assumed unless you say you don't have it), x spice or herb (asked about)
 */
export default `
# ---------- meat and poultry ----------
chicken-breast|meat|120|23|0|2.6|170|m|chicken breast|poitrine de poulet/blanc de poulet|pechuga de pollo|صدر دجاج|Hähnchenbrust|petto di pollo|peito de frango|tavuk göğsü
chicken-thigh|meat|121|19.7|0|4.1|110|m|chicken thigh|cuisse de poulet|muslo de pollo|فخذ دجاج|Hähnchenschenkel|coscia di pollo|coxa de frango|tavuk but
chicken-whole|meat|215|18.6|0|15.1|1400|m|whole chicken|poulet entier|pollo entero|دجاج كامل|ganzes Hähnchen|pollo intero|frango inteiro|bütün tavuk
chicken-wings|meat|222|18.3|0|15.9|35|m|chicken wings|ailes de poulet|alitas de pollo|أجنحة دجاج|Hähnchenflügel|ali di pollo|asas de frango|tavuk kanat
ground-beef|meat|215|18|0|15|0|m|ground beef|boeuf haché/viande hachée|carne picada de res|لحم بقري مفروم|Hackfleisch (Rind)|carne macinata di manzo|carne moída|kıyma
beef-steak|meat|180|21|0|10|220|m|beef steak|steak de boeuf|bistec de res|ستيك لحم بقري|Rindersteak|bistecca di manzo|bife|biftek
beef-stew|meat|170|21|0|9|0|m|stewing beef|boeuf à braiser|carne de res para guisar|لحم بقري للطبخ|Rindergulasch|spezzatino di manzo|carne de vaca para guisar|kuşbaşı et
lamb|meat|230|20|0|17|0|m|lamb|agneau|cordero|لحم ضأن/لحم خروف|Lamm|agnello|cordeiro|kuzu eti
ground-lamb|meat|283|17|0|23|0|m|ground lamb|agneau haché|cordero picado|لحم خروف مفروم|Lammhackfleisch|macinato di agnello|carne de cordeiro moída|kuzu kıyma
turkey-breast|meat|110|24|0|1.5|0|m|turkey breast|escalope de dinde|pechuga de pavo|صدر ديك رومي|Putenbrust|petto di tacchino|peito de peru|hindi göğsü
ground-turkey|meat|150|19|0|8|0|m|ground turkey|dinde hachée|pavo picado|ديك رومي مفروم|Putenhack|macinato di tacchino|peru moído|hindi kıyma
pork-loin|meat|143|21|0|6|0|mk|pork loin|longe de porc|lomo de cerdo|لحم خنزير|Schweinelende|lonza di maiale|lombo de porco|domuz filetosu
pork-belly|meat|518|9|0|53|0|mk|pork belly|poitrine de porc|panceta de cerdo|بطن الخنزير|Schweinebauch|pancetta di maiale|barriga de porco|domuz göbeği
ground-pork|meat|263|17|0|21|0|mk|ground pork|porc haché|cerdo picado|لحم خنزير مفروم|Schweinehack|macinato di maiale|carne de porco moída|domuz kıyma
bacon|meat|417|13|1.4|40|10|mk|bacon|lardons/bacon|beicon/tocino|لحم مقدد|Bacon/Frühstücksspeck|pancetta|bacon|domuz pastırması
ham|meat|145|21|1.5|6|0|mk|ham|jambon|jamón cocido|لحم الخنزير المطبوخ|Schinken|prosciutto cotto|fiambre/presunto cozido|jambon
sausage|meat|301|13|2|27|75|mk|pork sausage|saucisse|salchicha|سجق|Bratwurst|salsiccia|salsicha|sosis
chorizo|meat|455|24|2|38|0|mk|chorizo|chorizo|chorizo|تشوريزو|Chorizo|chorizo|chouriço|chorizo
merguez|meat|290|16|2|24|60|m|merguez|merguez|merguez|مرقاز|Merguez|merguez|merguez|merguez
sucuk|meat|420|22|3|36|0|m|sucuk|soudjouk|sucuk|سجق تركي|Sucuk|sucuk|sucuk|sucuk
liver-chicken|meat|119|17|0.7|4.8|0|m|chicken liver|foie de volaille|hígado de pollo|كبدة دجاج|Hühnerleber|fegato di pollo|fígado de frango|tavuk ciğeri
duck-breast|meat|200|19|0|14|0|m|duck breast|magret de canard|pechuga de pato|صدر بط|Entenbrust|petto d'anatra|peito de pato|ördek göğsü
rabbit|meat|136|21|0|5.5|0|m|rabbit|lapin|conejo|أرنب|Kaninchen|coniglio|coelho|tavşan
goat|meat|109|20.6|0|2.3|0|m|goat meat|chèvre (viande)/viande de chèvre|carne de cabra|لحم ماعز|Ziegenfleisch|carne di capra|carne de cabra|keçi eti
# ---------- fish and seafood ----------
salmon|fish|208|20|0|13|150|f|salmon|saumon|salmón|سلمون|Lachs|salmone|salmão|somon
tuna-canned|fish|116|26|0|1|0|f|canned tuna|thon en boîte|atún en lata|تونة معلبة|Thunfisch (Dose)|tonno in scatola|atum enlatado|konserve ton balığı
tuna-fresh|fish|130|29|0|1|0|f|fresh tuna|thon frais|atún fresco|تونة طازجة|frischer Thunfisch|tonno fresco|atum fresco|taze ton balığı
cod|fish|82|18|0|0.7|0|f|cod|cabillaud/morue|bacalao|سمك القد|Kabeljau|merluzzo|bacalhau|morina
white-fish|fish|90|19|0|1.2|150|f|white fish fillet|filet de poisson blanc|filete de pescado blanco|فيليه سمك أبيض|weißes Fischfilet|filetto di pesce bianco|filé de peixe branco|beyaz balık fileto
sea-bass|fish|97|18|0|2|0|f|sea bass|bar/loup de mer|lubina|قاروص|Wolfsbarsch|branzino|robalo|levrek
sardines|fish|208|25|0|11|0|f|sardines|sardines|sardinas|سردين|Sardinen|sardine|sardinhas|sardalya
mackerel|fish|205|19|0|14|0|f|mackerel|maquereau|caballa|ماكريل/إسقمري|Makrele|sgombro|cavala|uskumru
anchovies|fish|131|20|0|5|0|f|anchovies|anchois|anchoas|أنشوجة|Sardellen|acciughe|anchovas|hamsi
shrimp|fish|85|20.1|0|0.5|0|b|shrimp|crevettes|gambas/camarones|جمبري/روبيان|Garnelen|gamberi|camarão|karides
squid|fish|92|16|3|1.4|0|b|squid|calmar|calamar|حبار|Kalmar/Tintenfisch|calamari|lula|kalamar
mussels|fish|86|12|3.7|2.2|0|b|mussels|moules|mejillones|بلح البحر|Miesmuscheln|cozze|mexilhões|midye
octopus|fish|82|15|2.2|1|0|b|octopus|poulpe|pulpo|أخطبوط|Oktopus|polpo|polvo|ahtapot
crab-meat|fish|87|18|0|1|0|b|crab meat|chair de crabe|carne de cangrejo|لحم السلطعون|Krabbenfleisch|polpa di granchio|carne de caranguejo|yengeç eti
# ---------- eggs and dairy ----------
egg|egg|143|12.6|0.7|9.5|50|e|egg|oeuf|huevo|بيض|Ei|uovo|ovo|yumurta
egg-white|egg|52|11|0.7|0.2|33|e|egg white|blanc d'oeuf|clara de huevo|بياض البيض|Eiweiß|albume|clara de ovo|yumurta akı
milk|dairy|50|3.4|4.8|2|0|d|milk|lait|leche|حليب|Milch|latte|leite|süt
milk-skim|dairy|35|3.4|5|0.1|0|d|skimmed milk|lait écrémé|leche desnatada|حليب خالي الدسم|fettarme Milch|latte scremato|leite desnatado|yağsız süt
plant-milk|dairy|35|1|5|1.3|0|pgn|plant milk (oat, soy, almond)|lait végétal|bebida vegetal|حليب نباتي|Pflanzenmilch|latte vegetale|bebida vegetal|bitkisel süt
coconut-milk|fat|197|2|3|21|0|p|coconut milk|lait de coco|leche de coco|حليب جوز الهند|Kokosmilch|latte di cocco|leite de coco|hindistan cevizi sütü
cream|dairy|292|2|3|30|0|d|cream|crème fraîche liquide/crème|nata|كريمة|Sahne|panna|natas|krema
sour-cream|dairy|193|2.4|4.6|19|0|d|sour cream|crème aigre/crème fraîche épaisse|crema agria|قشدة حامضة|saure Sahne|panna acida|creme azedo|ekşi krema
yogurt|dairy|61|3.5|4.7|3.3|0|d|plain yogurt|yaourt nature|yogur natural|زبادي|Naturjoghurt|yogurt naturale|iogurte natural|yoğurt
greek-yogurt|dairy|97|9|4|5|0|d|Greek yogurt|yaourt grec|yogur griego|زبادي يوناني|griechischer Joghurt|yogurt greco|iogurte grego|süzme yoğurt
skyr|dairy|63|11|4|0.2|0|d|skyr or quark|skyr/fromage blanc 0%|skyr|سكير|Skyr/Quark|skyr|skyr|skyr
cottage-cheese|dairy|98|11|3.4|4.3|0|d|cottage cheese|fromage blanc/cottage cheese|requesón|جبن قريش|Hüttenkäse|ricotta/fiocchi di latte|queijo cottage|lor peyniri
cheddar|dairy|403|25|1.3|33|0|d|cheddar cheese|cheddar|queso cheddar|جبن شيدر|Cheddar|cheddar|queijo cheddar|çedar peyniri
mozzarella|dairy|280|28|3|17|0|d|mozzarella|mozzarella|mozzarella|موزاريلا|Mozzarella|mozzarella|mozzarela|mozzarella
parmesan|dairy|431|38|4|29|0|d|parmesan|parmesan|parmesano|بارميزان|Parmesan|parmigiano|parmesão|parmesan
feta|dairy|264|14|4|21|0|d|feta|feta|queso feta|جبنة فيتا|Feta|feta|queijo feta|beyaz peynir
halloumi|dairy|321|22|2|25|0|d|halloumi|halloumi|halloumi|حلوم|Halloumi|halloumi|halloumi|hellim
goat-cheese|dairy|264|18|0.1|21|0|d|goat cheese|fromage de chèvre|queso de cabra|جبن الماعز|Ziegenkäse|formaggio di capra|queijo de cabra|keçi peyniri
paneer|dairy|265|18|3.6|20|0|d|paneer|paneer|paneer|بانير|Paneer|paneer|paneer|paneer
cream-cheese|dairy|342|6|4|34|0|d|cream cheese|fromage à tartiner|queso crema|جبنة كريمية|Frischkäse|formaggio spalmabile|queijo creme|krem peynir
labneh|dairy|160|8|5|12|0|d|labneh|labné|labneh|لبنة|Labneh|labneh|labneh|süzme yoğurt (labne)
butter|fat|717|0.9|0.1|81|0|dp|butter|beurre|mantequilla|زبدة|Butter|burro|manteiga|tereyağı
ghee|fat|900|0|0|100|0|dp|ghee|ghee/beurre clarifié|ghee|سمن|Ghee|ghee|ghee|sade yağ
whey-protein|other|390|80|8|6|30|d|protein powder|protéines en poudre|proteína en polvo|مسحوق بروتين|Proteinpulver|proteine in polvere|proteína em pó|protein tozu
# ---------- oils and fats ----------
olive-oil|fat|884|0|0|100|0|p|olive oil|huile d'olive|aceite de oliva|زيت الزيتون|Olivenöl|olio d'oliva|azeite|zeytinyağı
vegetable-oil|fat|884|0|0|100|0|p|cooking oil|huile de cuisson/huile végétale|aceite vegetal|زيت نباتي|Pflanzenöl|olio di semi|óleo vegetal|sıvı yağ/ayçiçek yağı
sesame-oil|fat|884|0|0|100|0|p|sesame oil|huile de sésame|aceite de sésamo|زيت السمسم|Sesamöl|olio di sesamo|óleo de gergelim|susam yağı
# ---------- vegetables ----------
onion|veg|40|1.1|9.3|0.1|110|-|onion|oignon|cebolla|بصل|Zwiebel|cipolla|cebola|soğan
red-onion|veg|40|1.1|9.3|0.1|110|-|red onion|oignon rouge|cebolla morada|بصل أحمر|rote Zwiebel|cipolla rossa|cebola roxa|kırmızı soğan
spring-onion|veg|32|1.8|7.3|0.2|15|-|spring onion|oignon vert/cébette|cebolleta|بصل أخضر|Frühlingszwiebel|cipollotto|cebolinha|taze soğan
garlic|veg|149|6.4|33|0.5|5|-|garlic|ail|ajo|ثوم|Knoblauch|aglio|alho|sarımsak
ginger|veg|80|1.8|18|0.8|10|x|ginger|gingembre|jengibre|زنجبيل|Ingwer|zenzero|gengibre|zencefil
tomato|veg|18|0.9|3.9|0.2|120|-|tomato|tomate|tomate|طماطم|Tomate|pomodoro|tomate|domates
tomato-canned|veg|21|1.1|4.3|0.2|0|-|canned tomatoes|tomates en boîte|tomate en lata|طماطم معلبة|Dosentomaten|pomodori pelati|tomate enlatado|konserve domates
tomato-paste|sauce|82|4.3|19|0.5|0|p|tomato paste|concentré de tomate|concentrado de tomate|معجون الطماطم|Tomatenmark|concentrato di pomodoro|extrato de tomate|salça
cherry-tomato|veg|18|0.9|3.9|0.2|15|-|cherry tomatoes|tomates cerises|tomates cherry|طماطم كرزية|Kirschtomaten|pomodorini|tomate-cereja|çeri domates
potato|veg|77|2|17|0.1|170|-|potato|pomme de terre|patata/papa|بطاطس|Kartoffel|patata|batata|patates
sweet-potato|veg|86|1.6|20|0.1|130|-|sweet potato|patate douce|batata dulce/boniato|بطاطا حلوة|Süßkartoffel|patata dolce|batata-doce|tatlı patates
carrot|veg|41|0.9|10|0.2|61|-|carrot|carotte|zanahoria|جزر|Karotte|carota|cenoura|havuç
celery|veg|16|0.7|3|0.2|40|-|celery|céleri|apio|كرفس|Sellerie|sedano|aipo|kereviz sapı
bell-pepper|veg|26|1|6|0.3|120|-|bell pepper|poivron|pimiento|فلفل رومي|Paprika (Gemüse)|peperone|pimentão|dolmalık biber
green-chili|veg|40|2|9|0.2|10|x|fresh chili|piment frais|chile fresco|فلفل حار طازج|frische Chili|peperoncino fresco|pimenta fresca|acı biber
zucchini|veg|17|1.2|3.1|0.3|200|-|zucchini|courgette|calabacín|كوسا|Zucchini|zucchina|abobrinha|kabak
eggplant|veg|25|1|6|0.2|300|-|eggplant|aubergine|berenjena|باذنجان|Aubergine|melanzana|beringela|patlıcan
cucumber|veg|15|0.7|3.6|0.1|200|-|cucumber|concombre|pepino|خيار|Gurke|cetriolo|pepino|salatalık
lettuce|veg|15|1.4|2.9|0.2|0|-|lettuce|laitue/salade|lechuga|خس|Salat|lattuga|alface|marul
spinach|veg|23|2.9|3.6|0.4|0|-|spinach|épinards|espinacas|سبانخ|Spinat|spinaci|espinafres|ıspanak
kale|veg|49|4.3|9|0.9|0|-|kale|chou kale|col rizada|كيل/كرنب مجعد|Grünkohl|cavolo nero|couve|kara lahana
cabbage|veg|25|1.3|5.8|0.1|0|-|cabbage|chou|repollo/col|ملفوف|Kohl|cavolo|repolho|lahana
red-cabbage|veg|31|1.4|7.4|0.2|0|-|red cabbage|chou rouge|col lombarda|ملفوف أحمر|Rotkohl|cavolo rosso|repolho roxo|kırmızı lahana
broccoli|veg|34|2.8|7|0.4|0|-|broccoli|brocoli|brócoli|بروكلي|Brokkoli|broccoli|brócolos|brokoli
cauliflower|veg|25|1.9|5|0.3|0|-|cauliflower|chou-fleur|coliflor|قرنبيط|Blumenkohl|cavolfiore|couve-flor|karnabahar
green-beans|veg|31|1.8|7|0.2|0|-|green beans|haricots verts|judías verdes|فاصوليا خضراء|grüne Bohnen|fagiolini|feijão-verde|taze fasulye
peas|veg|81|5.4|14|0.4|0|-|peas|petits pois|guisantes|بازلاء|Erbsen|piselli|ervilhas|bezelye
corn|veg|86|3.3|19|1.4|0|-|corn|maïs|maíz|ذرة|Mais|mais|milho|mısır
mushrooms|veg|22|3.1|3.3|0.3|20|-|mushrooms|champignons|champiñones|فطر|Pilze|funghi|cogumelos|mantar
leek|veg|61|1.5|14|0.3|0|-|leek|poireau|puerro|كراث|Lauch|porro|alho-francês|pırasa
asparagus|veg|20|2.2|3.9|0.1|0|-|asparagus|asperges|espárragos|هليون|Spargel|asparagi|espargos|kuşkonmaz
beetroot|veg|43|1.6|10|0.2|80|-|beetroot|betterave|remolacha|شمندر|Rote Bete|barbabietola|beterraba|pancar
pumpkin|veg|26|1|6.5|0.1|0|-|pumpkin or squash|courge/potiron|calabaza|يقطين|Kürbis|zucca|abóbora|balkabağı
okra|veg|33|1.9|7.5|0.2|0|-|okra|gombo|okra/quimbombó|بامية|Okra|gombo|quiabo|bamya
fennel|veg|31|1.2|7|0.2|0|-|fennel|fenouil|hinojo|شمر|Fenchel|finocchio|funcho|rezene
radish|veg|16|0.7|3.4|0.1|0|-|radish|radis|rábano|فجل|Radieschen|ravanello|rabanete|turp
turnip|veg|28|0.9|6.4|0.1|0|-|turnip|navet|nabo|لفت|Speiserübe|rapa|nabo|şalgam
avocado|veg|160|2|8.5|14.7|150|-|avocado|avocat|aguacate|أفوكادو|Avocado|avocado|abacate|avokado
olives|veg|145|1|3.8|15|4|-|olives|olives|aceitunas|زيتون|Oliven|olive|azeitonas|zeytin
pickles|veg|11|0.3|2.3|0.2|0|-|pickles|cornichons|pepinillos|مخلل|Essiggurken|cetriolini|pepinos em conserva|turşu
sun-dried-tomato|veg|258|14|56|3|0|-|sun-dried tomatoes|tomates séchées|tomates secos|طماطم مجففة|getrocknete Tomaten|pomodori secchi|tomate seco|kuru domates
bamboo-shoots|veg|27|2.6|5.2|0.3|0|-|bamboo shoots|pousses de bambou|brotes de bambú|براعم الخيزران|Bambussprossen|germogli di bambù|brotos de bambu|bambu filizi
bok-choy|veg|13|1.5|2.2|0.2|0|-|bok choy|pak-choï|pak choi|بوك تشوي|Pak Choi|pak choi|pak choi|pak choy
cassava|veg|160|1.4|38|0.3|0|-|cassava|manioc|yuca|كسافا|Maniok|manioca|mandioca|manyok
plantain|veg|122|1.3|32|0.4|200|-|plantain|banane plantain|plátano macho|موز الطبخ|Kochbanane|platano da cucina (banana plantain)|banana-da-terra|pişirme muzu
jackfruit|veg|95|1.7|23|0.6|0|-|jackfruit|jacquier|yaca|جاك فروت|Jackfrucht|jackfruit|jaca|jackfruit
edamame|legume|121|12|9|5|0|-|edamame|edamame|edamame|إدامامي|Edamame|edamame|edamame|edamame
# ---------- fruit ----------
banana|fruit|89|1.1|23|0.3|120|-|banana|banane|plátano|موز|Banane|banana|banana|muz
apple|fruit|52|0.3|14|0.2|180|-|apple|pomme|manzana|تفاح|Apfel|mela|maçã|elma
lemon|fruit|29|1.1|9|0.3|60|-|lemon|citron|limón|ليمون|Zitrone|limone|limão|limon
lime|fruit|30|0.7|10.5|0.2|45|-|lime|citron vert|lima|ليمون أخضر|Limette|lime|lima|misket limonu
orange|fruit|47|0.9|12|0.1|140|-|orange|orange|naranja|برتقال|Orange|arancia|laranja|portakal
berries|fruit|50|0.8|12|0.4|0|-|berries (mixed)|fruits rouges|frutos rojos|توت مشكل|Beeren|frutti di bosco|frutos vermelhos|orman meyveleri
strawberry|fruit|32|0.7|7.7|0.3|0|-|strawberries|fraises|fresas|فراولة|Erdbeeren|fragole|morangos|çilek
blueberry|fruit|57|0.7|14|0.3|0|-|blueberries|myrtilles|arándanos|توت أزرق|Heidelbeeren|mirtilli|mirtilos|yaban mersini
mango|fruit|60|0.8|15|0.4|200|-|mango|mangue|mango|مانجو|Mango|mango|manga|mango
pineapple|fruit|50|0.5|13|0.1|0|-|pineapple|ananas|piña|أناناس|Ananas|ananas|abacaxi|ananas
dates|fruit|282|2.5|75|0.4|24|-|dates|dattes|dátiles|تمر|Datteln|datteri|tâmaras|hurma
raisins|fruit|299|3.1|79|0.5|0|-|raisins|raisins secs|pasas|زبيب|Rosinen|uvetta|passas|kuru üzüm
dried-apricot|fruit|241|3.4|63|0.5|0|-|dried apricots|abricots secs|orejones|مشمش مجفف|getrocknete Aprikosen|albicocche secche|damascos secos|kuru kayısı
pomegranate|fruit|83|1.7|19|1.2|0|-|pomegranate|grenade|granada|رمان|Granatapfel|melograno|romã|nar
coconut-grated|fruit|660|7|24|65|0|-|desiccated coconut|noix de coco râpée|coco rallado|جوز الهند المبشور|Kokosraspeln|cocco grattugiato|coco ralado|hindistan cevizi rendesi
peach|fruit|39|0.9|10|0.3|0|-|peach|pêche|melocotón|خوخ|Pfirsich|pesca|pêssego|şeftali
pear|fruit|57|0.4|15|0.1|0|-|pear|poire|pera|كمثرى|Birne|pera|pera|armut
grapes|fruit|69|0.7|18|0.2|0|-|grapes|raisin|uvas|عنب|Trauben|uva|uvas|üzüm
# ---------- grains, bread, pasta ----------
rice|grain|360|7|79|0.6|0|-|rice|riz|arroz|أرز|Reis|riso|arroz|pirinç
basmati-rice|grain|350|8|78|0.6|0|-|basmati rice|riz basmati|arroz basmati|أرز بسمتي|Basmatireis|riso basmati|arroz basmati|basmati pirinç
brown-rice|grain|362|7.5|76|2.7|0|-|brown rice|riz complet|arroz integral|أرز بني|Naturreis|riso integrale|arroz integral|esmer pirinç
sushi-rice|grain|358|6.5|79|0.5|0|-|sushi rice|riz à sushi|arroz para sushi|أرز السوشي|Sushireis|riso per sushi|arroz de sushi|suşi pirinci
risotto-rice|grain|350|7|78|0.6|0|-|risotto rice|riz arborio|arroz arborio|أرز أربوريو|Risottoreis|riso arborio|arroz arbóreo|arborio pirinci
pasta|grain|353|12|72|1.5|0|g|pasta|pâtes|pasta|معكرونة|Nudeln|pasta|massa|makarna
spaghetti|grain|353|12|72|1.5|0|g|spaghetti|spaghetti|espaguetis|سباغيتي|Spaghetti|spaghetti|esparguete|spagetti
noodles|grain|360|12|72|2|0|ge|egg noodles|nouilles|fideos|شعيرية صينية|Eiernudeln|noodles all'uovo|talharim|erişte
rice-noodles|grain|360|6|83|0.6|0|-|rice noodles|nouilles de riz|fideos de arroz|شعيرية الأرز|Reisnudeln|noodles di riso|talharim de arroz|pirinç eriştesi
couscous|grain|376|13|77|0.6|0|g|couscous|couscous|cuscús|كسكس|Couscous|cuscus|cuscuz|kuskus
bulgur|grain|342|12|76|1.3|0|g|bulgur|boulgour|bulgur|برغل|Bulgur|bulgur|bulgur|bulgur
quinoa|grain|368|14|64|6|0|-|quinoa|quinoa|quinoa|كينوا|Quinoa|quinoa|quinoa|kinoa
oats|grain|379|13|68|6.5|0|g|rolled oats|flocons d'avoine|copos de avena|شوفان|Haferflocken|fiocchi d'avena|aveia|yulaf
bread|grain|265|9|49|3.2|30|g|bread|pain|pan|خبز|Brot|pane|pão|ekmek
pita|grain|275|9|55|1.2|60|g|pita bread|pain pita|pan de pita|خبز عربي|Pita|pita|pão sírio|pita ekmeği
tortilla|grain|310|8|52|8|40|g|tortilla|tortilla|tortilla|خبز التورتيلا|Tortilla|tortilla|tortilha|tortilla
naan|grain|290|9|50|5|90|gd|naan|naan|naan|نان|Naan|naan|naan|naan
flour|grain|364|10|76|1|0|gp|flour|farine|harina|دقيق|Mehl|farina|farinha|un
breadcrumbs|grain|395|13|72|5|0|g|breadcrumbs|chapelure|pan rallado|فتات الخبز|Paniermehl|pangrattato|pão ralado|galeta unu
cornmeal|grain|362|8|77|3.6|0|-|cornmeal or polenta|semoule de maïs/polenta|harina de maíz|دقيق الذرة|Maismehl|farina di mais|fubá|mısır unu
semolina|grain|360|13|73|1|0|g|semolina|semoule|sémola|سميد|Grieß|semola|sêmola|irmik
rice-paper|grain|330|1|80|0|0|-|rice paper|galettes de riz|papel de arroz|ورق الأرز|Reispapier|carta di riso|papel de arroz|pirinç kağıdı
tapioca|grain|358|0.2|89|0|0|-|tapioca|tapioca|tapioca|تابيوكا|Tapioka|tapioca|tapioca|tapyoka
pizza-dough|grain|270|8|52|2|250|g|pizza dough|pâte à pizza|masa de pizza|عجينة بيتزا|Pizzateig|impasto per pizza|massa de pizza|pizza hamuru
phyllo|grain|300|8|56|4|30|g|phyllo pastry|pâte filo|pasta filo|عجينة الفيلو|Filoteig|pasta fillo|massa filo|yufka
# ---------- legumes, tofu ----------
chickpeas|legume|139|7|22|2.1|0|-|chickpeas (canned)|pois chiches (boîte)|garbanzos (bote)|حمص (معلب)|Kichererbsen (Dose)|ceci (in scatola)|grão-de-bico (lata)|nohut (konserve)
chickpeas-dry|legume|364|19|61|6|0|-|chickpeas (dry)|pois chiches secs|garbanzos secos|حمص ناشف|Kichererbsen (trocken)|ceci secchi|grão-de-bico seco|kuru nohut
lentils|legume|353|25|60|1.1|0|-|lentils (dry)|lentilles sèches|lentejas secas|عدس|Linsen (trocken)|lenticchie secche|lentilhas secas|kuru mercimek
red-lentils|legume|358|24|60|1.1|0|-|red lentils (dry)|lentilles corail|lentejas rojas|عدس أحمر|rote Linsen|lenticchie rosse|lentilhas vermelhas|kırmızı mercimek
black-beans|legume|132|8.9|24|0.5|0|-|black beans (canned)|haricots noirs|frijoles negros|فاصوليا سوداء|schwarze Bohnen|fagioli neri|feijão-preto|siyah fasulye
kidney-beans|legume|127|8.7|22|0.5|0|-|kidney beans (canned)|haricots rouges|frijoles rojos|فاصوليا حمراء|Kidneybohnen|fagioli rossi|feijão-vermelho|kırmızı fasulye
white-beans|legume|114|7.8|20|0.4|0|-|white beans (canned)|haricots blancs|alubias blancas|فاصوليا بيضاء|weiße Bohnen|fagioli bianchi|feijão-branco|beyaz fasulye
fava-beans|legume|110|7.6|19|0.4|0|-|fava beans|fèves|habas|فول|Dicke Bohnen|fave|favas|bakla
split-peas|legume|341|25|60|1.2|0|-|split peas (dry)|pois cassés|guisantes partidos|بازلاء مجففة|gelbe Erbsen|piselli secchi|ervilhas secas|kuru bezelye
mung-beans|legume|347|24|63|1.2|0|-|mung beans (dry)|haricots mungo|frijoles mungo|فاصوليا مونج|Mungbohnen|fagioli mung|feijão-mungo|maş fasulyesi
tofu|legume|76|8|1.9|4.8|0|-|tofu|tofu|tofu|توفو|Tofu|tofu|tofu|tofu
tempeh|legume|192|20|7.6|11|0|-|tempeh|tempeh|tempeh|تمبيه|Tempeh|tempeh|tempeh|tempeh
hummus|sauce|166|8|14|10|0|-|hummus|houmous|hummus|حمص بالطحينة|Hummus|hummus|húmus|humus
peanut-butter|nut|588|25|20|50|0|n|peanut butter|beurre de cacahuète|mantequilla de cacahuete|زبدة الفول السوداني|Erdnussbutter|burro di arachidi|manteiga de amendoim|fıstık ezmesi
# ---------- nuts and seeds ----------
almonds|nut|579|21|22|50|0|n|almonds|amandes|almendras|لوز|Mandeln|mandorle|amêndoas|badem
walnuts|nut|654|15|14|65|0|n|walnuts|noix|nueces|جوز|Walnüsse|noci|nozes|ceviz
cashews|nut|553|18|30|44|0|n|cashews|noix de cajou|anacardos|كاجو|Cashewkerne|anacardi|castanhas de caju|kaju
peanuts|nut|567|26|16|49|0|n|peanuts|cacahuètes|cacahuetes|فول سوداني|Erdnüsse|arachidi|amendoins|yer fıstığı
pistachios|nut|560|20|28|45|0|n|pistachios|pistaches|pistachos|فستق|Pistazien|pistacchi|pistácios|antep fıstığı
pine-nuts|nut|673|14|13|68|0|n|pine nuts|pignons de pin|piñones|صنوبر|Pinienkerne|pinoli|pinhões|çam fıstığı
hazelnuts|nut|628|15|17|61|0|n|hazelnuts|noisettes|avellanas|بندق|Haselnüsse|nocciole|avelãs|fındık
sesame-seeds|nut|573|18|23|50|0|-|sesame seeds|graines de sésame|semillas de sésamo|سمسم|Sesamsamen|semi di sesamo|sementes de gergelim|susam
tahini|sauce|595|17|21|54|0|-|tahini|tahini/purée de sésame|tahini|طحينة|Tahini|tahina|tahine|tahin
chia-seeds|nut|486|17|42|31|0|-|chia seeds|graines de chia|semillas de chía|بذور الشيا|Chiasamen|semi di chia|sementes de chia|chia tohumu
flax-seeds|nut|534|18|29|42|0|-|flax seeds|graines de lin|semillas de lino|بذور الكتان|Leinsamen|semi di lino|sementes de linhaça|keten tohumu
sunflower-seeds|nut|584|21|20|51|0|-|sunflower seeds|graines de tournesol|pipas de girasol|بذور عباد الشمس|Sonnenblumenkerne|semi di girasole|sementes de girassol|ay çekirdeği
pumpkin-seeds|nut|559|30|11|49|0|-|pumpkin seeds|graines de courge|pepitas|بذور اليقطين|Kürbiskerne|semi di zucca|sementes de abóbora|kabak çekirdeği
# ---------- sauces, condiments, pantry ----------
soy-sauce|sauce|53|8|4.9|0.6|0|pg|soy sauce|sauce soja|salsa de soja|صلصة الصويا|Sojasauce|salsa di soia|molho de soja|soya sosu
fish-sauce|sauce|35|5|3.6|0|0|pf|fish sauce|sauce de poisson|salsa de pescado|صلصة السمك|Fischsauce|salsa di pesce|molho de peixe|balık sosu
oyster-sauce|sauce|51|1.4|11|0.3|0|pbg|oyster sauce|sauce d'huître|salsa de ostras|صلصة المحار|Austernsauce|salsa di ostriche|molho de ostra|istiridye sosu
hoisin|sauce|220|3|44|3.4|0|pg|hoisin sauce|sauce hoisin|salsa hoisin|صلصة هوازين|Hoisinsauce|salsa hoisin|molho hoisin|hoisin sosu
mirin|sauce|240|0.2|43|0|0|pa|mirin|mirin|mirin|ميرين|Mirin|mirin|mirin|mirin
miso|sauce|199|12|26|6|0|pg|miso paste|pâte de miso|pasta de miso|معجون ميسو|Misopaste|pasta di miso|pasta de missô|miso
gochujang|sauce|200|5|40|2|0|pg|gochujang|gochujang|gochujang|غوتشوجانغ|Gochujang|gochujang|gochujang|gochujang
harissa|sauce|60|2.5|9|2|0|p|harissa|harissa|harissa|هريسة|Harissa|harissa|harissa|harissa
sriracha|sauce|93|1.9|19|0.9|0|p|hot sauce|sauce piquante|salsa picante|صلصة حارة|scharfe Soße|salsa piccante|molho picante|acı sos
ketchup|sauce|101|1|27|0.1|0|p|ketchup|ketchup|kétchup|كاتشب|Ketchup|ketchup|ketchup|ketçap
mustard|sauce|66|4|6|3.6|0|p|mustard|moutarde|mostaza|خردل|Senf|senape|mostarda|hardal
mayonnaise|sauce|680|1|0.6|75|0|pe|mayonnaise|mayonnaise|mayonesa|مايونيز|Mayonnaise|maionese|maionese|mayonez
vinegar|sauce|20|0|0.9|0|0|p|vinegar|vinaigre|vinagre|خل|Essig|aceto|vinagre|sirke
balsamic|sauce|88|0.5|17|0|0|p|balsamic vinegar|vinaigre balsamique|vinagre balsámico|خل بلسمي|Balsamico|aceto balsamico|vinagre balsâmico|balzamik sirke
pomegranate-molasses|sauce|250|0|62|0|0|p|pomegranate molasses|mélasse de grenade|melaza de granada|دبس الرمان|Granatapfelsirup|melassa di melograno|melaço de romã|nar ekşisi
stock-cube|sauce|230|6|20|13|10|pg|stock cube|bouillon cube|cubito de caldo|مكعب مرق|Brühwürfel|dado|cubo de caldo|bulyon
chicken-stock|sauce|7|1|0.5|0.2|0|pm|chicken stock|bouillon de poulet|caldo de pollo|مرق دجاج|Hühnerbrühe|brodo di pollo|caldo de galinha|tavuk suyu
vegetable-stock|sauce|6|0.3|1|0.1|0|p|vegetable stock|bouillon de légumes|caldo de verduras|مرق خضار|Gemüsebrühe|brodo vegetale|caldo de legumes|sebze suyu
pesto|sauce|470|5|5|48|0|dn|pesto|pesto|pesto|بيستو|Pesto|pesto|pesto|pesto
tomato-sauce|sauce|40|1.5|8|0.5|0|p|tomato sauce|sauce tomate|salsa de tomate|صلصة طماطم|Tomatensauce|passata/sugo|molho de tomate|domates sosu
salsa|sauce|36|1.5|7|0.2|0|p|salsa|salsa|salsa|سالسا|Salsa|salsa|salsa|salsa
curry-paste|sauce|130|3|14|7|0|pb|curry paste|pâte de curry|pasta de curry|معجون الكاري|Currypaste|pasta di curry|pasta de caril|köri salçası
sugar|sweet|387|0|100|0|0|p|sugar|sucre|azúcar|سكر|Zucker|zucchero|açúcar|şeker
brown-sugar|sweet|380|0.1|98|0|0|p|brown sugar|sucre roux|azúcar moreno|سكر بني|brauner Zucker|zucchero di canna|açúcar mascavo|esmer şeker
honey|sweet|304|0.3|82|0|0|ph|honey|miel|miel|عسل|Honig|miele|mel|bal
maple-syrup|sweet|260|0|67|0|0|p|maple syrup|sirop d'érable|sirope de arce|شراب القيقب|Ahornsirup|sciroppo d'acero|xarope de ácer|akçaağaç şurubu
dark-chocolate|sweet|546|5|60|31|0|-|dark chocolate|chocolat noir|chocolate negro|شوكولاتة داكنة|dunkle Schokolade|cioccolato fondente|chocolate negro|bitter çikolata
cocoa|sweet|228|20|58|14|0|-|cocoa powder|cacao en poudre|cacao en polvo|مسحوق الكاكاو|Kakaopulver|cacao in polvere|cacau em pó|kakao
jam|sweet|250|0.4|65|0.1|0|p|jam|confiture|mermelada|مربى|Konfitüre/Marmelade|marmellata|doce/compota|reçel
baking-powder|other|53|0|28|0|0|p|baking powder|levure chimique|levadura química|بيكنج باودر|Backpulver|lievito in polvere|fermento em pó|kabartma tozu
yeast|other|325|40|41|7|0|p|yeast|levure|levadura|خميرة|Hefe|lievito|fermento|maya
cornstarch|other|381|0.3|91|0.1|0|p|cornstarch|maïzena|maicena|نشا الذرة|Speisestärke|amido di mais|amido de milho|mısır nişastası
white-wine|other|82|0.1|2.6|0|0|pa|white wine (for cooking)|vin blanc|vino blanco|نبيذ أبيض|Weißwein|vino bianco|vinho branco|beyaz şarap
red-wine|other|85|0.1|2.6|0|0|pa|red wine (for cooking)|vin rouge|vino tinto|نبيذ أحمر|Rotwein|vino rosso|vinho tinto|kırmızı şarap
coconut-water|other|19|0.7|3.7|0.2|0|-|coconut water|eau de coco|agua de coco|ماء جوز الهند|Kokoswasser|acqua di cocco|água de coco|hindistan cevizi suyu
seaweed|other|188|41|44|3.7|0|-|nori seaweed|algues nori|alga nori|أعشاب البحر|Nori|alga nori|alga nori|nori yosunu
water|other|0|0|0|0|0|s|water|eau|agua|ماء|Wasser|acqua|água|su
salt|spice|0|0|0|0|0|sx|salt|sel|sal|ملح|Salz|sale|sal|tuz
black-pepper|spice|251|10|64|3.3|0|sx|black pepper|poivre|pimienta negra|فلفل أسود|Pfeffer|pepe nero|pimenta-do-reino|karabiber
# ---------- spices and herbs ----------
paprika|spice|282|14|54|13|0|x|paprika|paprika|pimentón/paprika|بابريكا|Paprika (Gewürz)|paprika|colorau/páprica|toz kırmızı biber/paprika
smoked-paprika|spice|282|14|54|13|0|x|smoked paprika|paprika fumé|pimentón ahumado|بابريكا مدخنة|geräuchertes Paprikapulver|paprika affumicata|páprica defumada|füme paprika
cumin|spice|375|18|44|22|0|x|cumin|cumin|comino|كمون|Kreuzkümmel|cumino|cominho|kimyon
coriander-seeds|spice|298|12|55|18|0|x|ground coriander|coriandre moulue|cilantro molido|كزبرة مطحونة|Koriander (gemahlen)|coriandolo in polvere|coentro em pó|kişniş tohumu
turmeric|spice|312|10|67|3|0|x|turmeric|curcuma|cúrcuma|كركم|Kurkuma|curcuma|açafrão-da-terra|zerdeçal
curry-powder|spice|325|14|58|14|0|x|curry powder|poudre de curry|curry en polvo|مسحوق الكاري|Currypulver|curry in polvere|caril em pó|köri
garam-masala|spice|379|15|45|15|0|x|garam masala|garam masala|garam masala|جارام ماسالا|Garam Masala|garam masala|garam masala|garam masala
chili-powder|spice|282|13|50|14|0|x|chili powder|piment en poudre|chile en polvo|فلفل حار مطحون|Chilipulver|peperoncino in polvere|piri-piri em pó|toz acı biber
chili-flakes|spice|282|13|50|14|0|x|chili flakes|piment en flocons|chile en copos|رقائق الفلفل الحار|Chiliflocken|peperoncino in scaglie|flocos de pimenta|pul biber
cayenne|spice|318|12|57|17|0|x|cayenne pepper|piment de Cayenne|pimienta de cayena|فلفل كايين|Cayennepfeffer|pepe di cayenna|pimenta caiena|kayen biberi
cinnamon|spice|247|4|81|1.2|0|x|cinnamon|cannelle|canela|قرفة|Zimt|cannella|canela|tarçın
cardamom|spice|311|11|68|7|0|x|cardamom|cardamome|cardamomo|هيل|Kardamom|cardamomo|cardamomo|kakule
cloves|spice|274|6|66|13|0|x|cloves|clous de girofle|clavos|قرنفل|Nelken|chiodi di garofano|cravo|karanfil
nutmeg|spice|525|6|49|36|0|x|nutmeg|noix de muscade|nuez moscada|جوزة الطيب|Muskatnuss|noce moscata|noz-moscada|muskat
allspice|spice|263|6|72|9|0|x|allspice|piment de la Jamaïque|pimienta de Jamaica|بهارات حلوة|Piment|pepe della Giamaica|pimenta-da-jamaica|yenibahar
saffron|spice|310|11|65|6|0|x|saffron|safran|azafrán|زعفران|Safran|zafferano|açafrão|safran
sumac|spice|250|3|60|3|0|x|sumac|sumac|sumac|سماق|Sumach|sommacco|sumagre|sumak
za'atar|spice|290|10|50|10|0|x|za'atar|zaatar|zaatar|زعتر|Za'atar|za'atar|za'atar|zahter
ras-el-hanout|spice|300|10|55|10|0|x|ras el hanout|ras el hanout|ras el hanout|رأس الحانوت|Ras el Hanout|ras el hanout|ras el hanout|ras el hanout
baharat|spice|300|10|55|10|0|x|baharat|baharat|baharat|بهارات|Baharat|baharat|baharat|baharat
berbere|spice|290|12|50|10|0|x|berbere|berbéré|berbere|بربري|Berbere|berbere|berbere|berbere
five-spice|spice|300|10|55|10|0|x|five-spice powder|cinq-épices|cinco especias|خمس توابل|Fünf-Gewürze-Pulver|cinque spezie|cinco especiarias|beş baharat
mustard-seeds|spice|508|26|28|36|0|x|mustard seeds|graines de moutarde|semillas de mostaza|بذور الخردل|Senfkörner|semi di senape|sementes de mostarda|hardal tohumu
fenugreek|spice|323|23|58|6|0|x|fenugreek|fenugrec|fenogreco|حلبة|Bockshornklee|fieno greco|feno-grego|çemen otu
oregano|herb|265|9|69|4.3|0|x|oregano|origan|orégano|أوريجانو|Oregano|origano|orégãos|kekik
thyme|herb|101|5.6|24|1.7|0|x|thyme|thym|tomillo|زعتر بري|Thymian|timo|tomilho|kekik (thyme)
rosemary|herb|131|3.3|21|5.9|0|x|rosemary|romarin|romero|إكليل الجبل|Rosmarin|rosmarino|alecrim|biberiye
basil|herb|23|3.2|2.7|0.6|0|x|basil|basilic|albahaca|ريحان|Basilikum|basilico|manjericão|fesleğen
parsley|herb|36|3|6.3|0.8|0|x|parsley|persil|perejil|بقدونس|Petersilie|prezzemolo|salsa|maydanoz
coriander-fresh|herb|23|2.1|3.7|0.5|0|x|fresh coriander|coriandre fraîche|cilantro fresco|كزبرة خضراء|frischer Koriander|coriandolo fresco|coentros|taze kişniş
mint|herb|44|3.3|8.4|0.7|0|x|mint|menthe|menta/hierbabuena|نعناع|Minze|menta|hortelã|nane
dill|herb|43|3.5|7|1.1|0|x|dill|aneth|eneldo|شبت|Dill|aneto|endro|dereotu
bay-leaf|herb|313|7.6|75|8.4|0|x|bay leaf|laurier|laurel|ورق الغار|Lorbeerblatt|alloro|louro|defne yaprağı
sage|herb|315|10.6|61|12.8|0|x|sage|sauge|salvia|مريمية|Salbei|salvia|salva|adaçayı
chives|herb|30|3.3|4.4|0.7|0|x|chives|ciboulette|cebollino|ثوم معمر|Schnittlauch|erba cipollina|cebolinho|frenk soğanı
lemongrass|herb|99|1.8|25|0.5|0|x|lemongrass|citronnelle|hierba limón|عشب الليمون|Zitronengras|citronella|capim-limão|limon otu
curry-leaves|herb|108|6|19|1|0|x|curry leaves|feuilles de curry|hojas de curry|أوراق الكاري|Curryblätter|foglie di curry|folhas de caril|köri yaprağı
vanilla|spice|288|0.1|13|0.1|0|x|vanilla|vanille|vainilla|فانيليا|Vanille|vaniglia|baunilha|vanilya
garlic-powder|spice|331|17|73|0.7|0|x|garlic powder|ail en poudre|ajo en polvo|ثوم مطحون|Knoblauchpulver|aglio in polvere|alho em pó|sarımsak tozu
onion-powder|spice|341|10|79|1|0|x|onion powder|oignon en poudre|cebolla en polvo|بصل مطحون|Zwiebelpulver|cipolla in polvere|cebola em pó|soğan tozu
italian-herbs|herb|265|9|69|4.3|0|x|mixed Italian herbs|herbes italiennes|hierbas italianas|أعشاب إيطالية|italienische Kräuter|erbe italiane|ervas italianas|İtalyan otları
`;
