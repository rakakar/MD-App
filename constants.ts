import { View, Book, User, Thread, RoadmapLevel, Event, Note } from './types';
import { MessageSquareIcon, UsersIcon, MilestoneIcon, CalendarIcon, BookOpenIcon, UserCircleIcon } from './components/icons';

export const NAVIGATION_ITEMS = [
  { id: View.Discussions, label: 'Discussions', icon: MessageSquareIcon },
  { id: View.Directory, label: 'Directory', icon: UsersIcon },
  { id: View.Roadmap, label: 'Roadmap', icon: MilestoneIcon },
  { id: View.Events, label: 'Events', icon: CalendarIcon },
  { id: View.Read, label: 'Read', icon: BookOpenIcon },
  { id: View.Profile, label: 'Profile', icon: UserCircleIcon },
];

export const MOCK_CURRENT_USER: User = {
    id: 'u-current',
    name: 'Riya Patel',
    age: 28,
    avatarUrl: 'https://picsum.photos/seed/riya/200/200',
    city: 'Pune',
    country: 'India',
    studyLevel: 'Reflection',
    interests: ['Coexistence', 'Education', 'Nature'],
    bio: 'Diving deep into Madhyasth Darshan to find clarity and purpose. I believe in the power of self-exploration for a harmonious life.'
};


const bookChapters = [
    {
      id: 'mvd-1',
      title: 'अध्याय 1: सहअस्तित्व',
      content: `अध्याय - एक
सहअस्तित्व

में नित्य, सत्य, शुद्ध एवं बुद्ध व्यापक सत्ता में सम्पुक्त जड़-चैतन्य प्रकृति को अनुभव पूर्वक स्मरण करते हुए मानव व्यवहार दर्शन का विश्लेषण करता हूँ।

नित्य :- सदा-सदा एक सा विद्यमान है।
सत्य :- सदा-सदा एक सा भास-आभासमान एवं अनुभवगम्य है।
शुद्ध :- सदा-सदा एक सा सुखप्रद (अनुभव में) है।
बुद्ध :- सदा-सदा एक सा बोधगम्य है।
व्यापक सत्ता:- सदा-सदा प्रकृति होने और न होने के स्थलों में वैभव ।
सत्ता, जड़-चेतन्य में पारगामी व परस्परता में पारदशी है । सत्तामयता को परमात्मा, ईश्वर, लोकेश, चेतना, शून्य, निरपेक्ष ऊर्जा, पूर्ण संज्ञा है।
सम्पृक्त :- सत्ता में डूबा, भीगा, घिरा हुआ जड़-चैतन्य प्रकृति है। यही सहअस्तित्व है, सहअस्तित्व ही नित्य है, यही ज्ञान है। सहअस्तित्व में ही नियम, नियंत्रण, संतुलन, न्याय, धर्म, परम सत्य स्पष्ट हैं।
जड़ :- इकाईयाँ जो अपनी लंबाई, चौड़ाई, ऊँचाई की सीमा में क्रियाशील हैं।
चैतन्य :- इकाईयाँ जो अपने लंबाई, चौड़ाई, ऊँचाई की सीमा से अधिक स्थली में पुंजाकार रूप में क्रियाशील हैं। यहाँ स्थली का तात्पर्य सत्तामयता है।

जागृत मानव ही दृष्टा पद प्रतिष्ठा में गण्य है।
मानव :- मनाकार को साकार करने तथा मन: स्वस्थता का आशावादी और प्रमाणित करने वाले को मानव संज्ञा है।
व्यवहार :- एक से अधिक मानव एकत्र होने के लिए अथवा होने में जो श्रम नियोजन है उसे व्यवहार संज्ञा है।
दर्शन :- दृष्टि से प्राप्त समझ, अवधारणा और अनुभव ही दर्शन है।
दृष्टि :- वास्तविकताओं को देखने, समझने, पहचानने और मूल्यांकन करने की क्रिया की दृष्टि संज्ञा है।

विश्लेषण :- परिभाषाओं का प्रयोजन के अर्थ में व्याख्या की विश्लेषण संज्ञा है।
परिभाषा :- अर्थ को इंगित करने के लिए प्रयुक्त शब्द समूह की परिभाषा संज्ञा है ।

व्यापक पूर्ण और इकाईयाँ अनंत हैं।
व्यापक :- जो सर्व देश - काल में विद्यमान है तथा नित्य वर्तमान है।
इकाई :- छः ओर से (सभी ओर से) सीमित पदार्थ पिण्ड की इकाई संज्ञा है।
व्यापक वस्तु में सम्पूर्ण इकाईयाँ सहअस्तित्व में अविभाज्य रूप में वर्तमान हैं ।
अनंत :- संख्या में अग्राह्म क्रिया की अनंत संज्ञा है जिसको मानव गिनने में असमर्थ है अथवा गिनने की आवश्यकता नहीं बनती, यही अनन्त है।

व्यापक सत्ता जागृत मानव में, से, के लिये कार्य-व्यवहार काल में नियम के रूप में, विचार काल में समाधान के रूप में, अनुभव काल में आनंद के रूप में और आचरण काल में न्याय के रूप में प्राप्त है क्योंकि सत्ता में संपूर्ण प्रकृति सम्पृक्त अविभाज्य रूप में विद्यमान है। यही सहअस्तित्व है।
काल:-. क्रिया की अवधि की काल संज्ञा है।
नियम:- आचरण और क्रिया की नियंत्रण पृष्ठभूमि ही नियम है।
समाधान:- क्यों और कैसे की पूर्ति (उत्तर) ही समाधान है।
आनंद :- सहअस्तित्व रूपी परम सत्यानुभूति ही आनंद है ।
न्याय:- परस्परता में मानवीयतापूर्ण व्यवहार ही न्याय है।

मानवीयतापूर्ण व्यवहार :- धीरता, वीरता, उदारता, दया, कृपा, करुणा पूर्ण स्वभाव; न्याय, धर्म एवं सत्यतापूर्ण दृष्टि और वित्तेषणा, पुत्रेषणा एवं लोकेषणात्मक प्रवृत्ति से युक्त व्यवहार ही मानवीयतापूर्ण व्यवहार है।
अस्तित्व में, से, के लिए जानने, पहचानने और अनुभव करने का प्रयास व अध्ययन मानव करता रहा है एवं करता रहेगा।
ज्ञान को अनुभव काल में आनंद; सर्वत्र एक सा अनुभव में आने के कारण सत्य; ज्ञान में समस्त क्रियायें संरक्षित और नियंत्रित होने के कारण लोकेश; सर्वत्र एक सा विद्यमान होने के कारण व्यापक; चेतन्य के साथ चेतना; आत्मा से सूक्षमतम होने के कारण परमात्मा; प्रत्येक वस्तु सत्ता में सम्पुक्त, सक्रिय रहने के कारण से इसे निरपेक्ष ऊर्जा तथा अपरिणामिता के कारण पूर्ण संज्ञा है।

सहअस्तित्व में अनुभव ही ज्ञान का उद्घाटन है। सहअस्तित्व में अनुभव में, से, के लिए अध्ययन है। ज्ञान ही विवेक एवं विज्ञान रूप में प्रमाण है। यही ज्ञानावस्था में मानव सहज मौलिकता है।
ज्ञान स्वयं क्रिया न करते हुए अथवा क्रिया न होते हुए मानव जीवन में अनुभव स्थिति में आनन्द सहज वैभव प्रमाण है। अनुभव पूर्वक अभिव्यवित ही ज्ञान है।
ज्ञान ही जागृत मानव में समस्त सकारात्मक क्रियाओं का आधार अथवा प्रेरणा स्त्रोत है।

ज्ञान ही व्यापक सत्ता है। इसकी ही शून्य संज्ञा है।
क्रियाहीनता की स्थिति की शून्य संज्ञा है तथा ज्ञान स्वयम्‌ क्रिया न करते हुए अथवा क्रिया न होते हुए भी समस्त क्रियाओं का आधार और प्रेरणा स्त्रोत है।
अतः ज्ञान और व्यापक सत्ता दोनों एक ही सिद्ध होते हैं तथा इसमें अवस्थित होने से ही क्रिया के लिए प्रेरणा प्राप्त है। ज्ञान से रिक्त और मुक्त इकाई नहीं है।
`,
    },
    {
      id: 'mvd-2',
      title: 'अध्याय 2: कृतज्ञता',
      content: `अध्याय - दो
कृतज्ञता

में कृतज्ञता पूर्वक उन सुपथ प्रदर्शकों की बंदना करता हूँ, जिनसे यथार्थता के स्रोत आज भी जीवित हैं।

कृतज्ञता:- उन्नति और जागृति के लिये प्रेरणा और सहायता की स्वीकृति।
सुपथ:- समाधान, समृद्धि, अभय व सहअस्तित्व की ओर निश्चित दिशा ।
उन्नति :- उत्थान (समाधान, समृद्धि, अभय, सहअस्तित्व) के लिए प्राप्त प्रेरणा व सहायता।
यथार्थता के स्रोत (अकृत्रिमता पूर्वक अथवा आडंबरहीन) वास्तविकतापूर्ण ढंग से की गई अभिव्यक्ति अथवा प्रयास। सत्ता में सम्पुक्त प्रकृति रूपी सहअस्तित्व को स्पष्ट करना ही यथार्थता का स्त्रोत है।
स्थिति सत्य, वस्तु स्थिति सत्य व वस्तुगत सत्य को बोध कराने की परम्परा ही यथार्थता के स्रोत हैं।
बंदना :- गौरवता को व्यक्त करने हेतु प्रयुक्त चेष्टा ।
गौरवता:- निर्विरोध पूर्वक अंगीकार किये गये अनुकरण, प्रयास, प्रवृत्ति ही गौरबता है।

कृतज्ञता से गौरवता, गौरवता से सरलता, सरलता से सहजता, सहजता से मानवीयता, मानवीयता से सहअस्तित्व तथा सहअस्तित्व में से, के लिए कृतज्ञता प्रकट होती है।
सरलता :- अभिमान से रहित और यथार्थता को व्यक्त करने की विचार व व्यवहार पद्धति ही सरलता है।
अभिमान :- आरोपित मानदण्ड, यही अधिमूल्यन, अवमूल्यन, निर्मूल्यन दोष है।
सहजता :- आडंबर तथा रहस्यता से मुक्त न्यायपूर्ण व्यवहार व रीति ही सहजता है।
सहअस्तित्व :- परस्परता में निर्विरोध सहित समाधानपूर्ण अभिव्यक्ति ही सहअस्तित्व है।

मानव का समूचा व्यवहार कृतज्ञता तथा कृतघ्नता के आधार पर ही निर्भर करता है तथा मूल्यांकित व समीक्षित होता है।
कृतघ्नता :- जिस किसी से भी उन्नति व जागृति की ओर प्राप्ति में सहायता मिली हो उसे अस्वीकार करना ही कृतघ्नता है।
`,
    },
    {
      id: 'mvd-3',
      title: 'अध्याय 3: सृष्टि-दर्शन',
      content: `अध्याय - तीन
सृष्टि- दर्शन

मानव ने सृष्टि दर्शन करने की कामना व प्रयास किया है, यथा जीव-जगत, ईश्वर और स्वयं को प्रतिपादित व व्याख्यायित करने का प्रयास किया है।
सृष्टि :- पदार्थ का संगठन एवं रचना और समृद्ध धरती तथा धरती पर प्राणावस्था, जीवावस्था, ज्ञानावस्था का प्रकाशन सृष्टि है।

सृजन, विसर्जन, पोषण अथवा शोषण के भेद से सृष्टि दर्शन है।
सृजन :- इकाई+इकाई।
विसर्जन :- इकाई-इकाई।
पोषण :- इकाई+ अनुकूल इकाई ।।
शोषण :- इकाई-अनकूल इकाई।
पदार्थ :- पद भेद से अर्थ भेद को स्पष्ट करने वाली वस्तु की पदार्थ संज्ञा है। वस्तु का अर्थ वास्तविकता ही है।

निरपेक्ष ऊर्जा व पदार्थों के सहअस्तित्व में ही सृष्टि कार्य है।
निरपेक्ष ऊर्जा :- जो व्यापक रूप में सहज सत्ता अस्तित्व है पर जिसके उत्पत्ति का कारण सिद्ध न हो, उसकी निरपेक्ष ऊर्जा संज्ञा है ।

निरपेक्ष ऊर्जा शून्य की स्थिति में सर्वत्र व्याप्त है।
शून्य:- जो स्वयं में क्रिया नहीं है पर सभी क्रियायें जिसमें समाहित (आवेष्टित एवं आश्लिष्ट) हैं की शून्य संज्ञा है।

सापेक्ष एवं निरपेक्ष भेद से ऊर्जा है। इसे सापेक्ष ऊर्जा व निरपेक्ष ऊर्जा के रूप में पहचानना और समझना होता है। कार्य ऊर्जा सापेक्ष है तथा व्यापक रूप में निरपेक्ष ऊर्जा नित्य वर्तमान है।
सापेक्ष ऊर्जा :- ईकाइयों की परस्परता के बिना जिस शक्ति का प्रगटन न हो, वह सापेक्ष ऊर्जा है।
भौतिक रासायनिक वस्तुओं की परस्परता में अथवा परस्परता वश प्रगट होने वाली शक्तियां जैसे दबाव, तरंग व प्रभाव को सापेक्ष ऊर्जा के रूप में पहचाना जाता है।
ताप, ध्वनि, विद्युत भी सापेक्ष ऊर्जा है।

निरपेक्ष ऊर्जा के बिना पदार्थों में मूल चेष्टा तथा पदार्थ के बिना निरपेक्ष ऊर्जा का परिचय नहीं है। निरपेक्ष ऊर्जा में प्रकृति नित्य वर्तमान है।
मूल चेष्टा :- श्रम, गति एवं परिणाम की सम्मलित क्रिया ही मूल चेष्टा है ।
संपूर्ण पदार्थ अपनी परमाण्विक स्थिति में सचेष्ट हैं। इसलिए स्पष्ट होता है कि उन्हें ऊर्जा प्राप्त है। जिस ऊर्जा (शक्ति) से समस्त पदार्थ अपने परमाण्विक स्थिति में स्चेष्ट है वह ही निरपेक्ष ऊर्जा है।
उक्त रीति से पदार्थ एवं निरपेक्ष ऊर्जा का सहअस्तित्व सदा-सदा अविभाज्य रूप में होना सिद्ध होता है।
मानव सुदूर विगत से वर्तमान तक परमाणुओं में पाई जाने वाली क्रियाशीलता के लिये मूल ऊर्जा स्रोत के संदर्भ में अज्ञात रहे । अब यह सहअस्तित्व विधि से स्पष्ट हुआ। सत्ता रूपी ऊर्जा के अस्तित्व को निरपेक्ष ऊर्जा के रूप में स्वीकारा गया है, क्योंकि इसे हम परमाणुओं की क्रिया के मूल में पाते हैं। यह निरपेक्ष ऊर्जा सर्वत्र एक सी रहने के कारण इसे साम्य ऊर्जा संज्ञा है। सत्ता से रिक्त व मुक्त क्रिया सिद्ध नहीं होती है। सत्ता ही व्यापक है। शून्य ही निरपेक्ष ऊर्जा है, शून्य ही सत्ता है।
निरपेक्ष ऊर्जा एवं पदार्थ में इतना अंतर है कि निरपेक्ष ऊर्जा हर काल, स्थान व वस्तु में व्याप्त है। निरपेक्ष ऊर्जा न हो ऐसा कोई स्थान व वस्तु प्राप्त या सिद्ध नहीं है, परंतु पदार्थ न हो ऐसा स्थान है, पर ऐसा काल सिद्ध नहीं है। पदार्थ का प्रत्येक अंश ऊर्जामय है।
स्थान :- व्यापक सत्ता अथवा शून्य क्योंकि एक-एक वस्तु सत्ता में समायी है।
:- पदार्थ का विस्तार बराबर स्थान।
पदार्थ के संगठन तथा अवस्था भेद से ही पदार्थ की मात्रा एवं रूप की अवधियाँ हैं।
समस्त पदार्थ ठोस, तरल अथवा विरल (वायु) के रूप में उपलब्ध हैं । इन अवस्थाओं में पदार्थ तात्विक, यौगिक अथवा मिश्रण के रूप में प्राप्त है।

तात्विक:- सजातीय परमाण्विक समूह के गठन की तात्विक संज्ञा है।
मिश्रण :- विजातीय परमाण्विक अथवा आण्विक समूह का ऐसा गठन जिसमें सभी अपने-अपने आचरण को बनाये रखते हैं।
योगिक:- दो या अधिक प्रजाति की वस्तुयें निश्चित अनुपात से मिलकर, अपने-अपने आचरण को त्याग कर, अन्य प्रकार के आचरण को प्रस्तुत करते हैं।
यौगिक में रासायनिक तथा भौतिक दोनों परिणाम होते हैं, जबकि मिश्रण में केवल भौतिक परिणाम होते हैं।

परमाणुओं के मध्यांश एवं आश्रित कणों के संख्या भेद से परमाणुओं की जाति एवं अवस्था और मात्रा का निर्णय होता है ।
वायु:- विरल पदार्थ राशि के नृत्य (तरंग) रूप में गतिशीलता वायु है। जिनके योग से द्रव एवं ताप का प्रसव है।

योग :- मिलन को योग संज्ञा है। योग के दो भेद हैं।
. ऐक्य, 2. सहवास
ऐक्य :- सजातीय मिलन की ऐक्य संज्ञा है।
सहवास :- जिस योग के अनन्तर विछगीकरण संभव हो, उसकी सहवास संज्ञा है।
सहवास के अनन्तर उन्नति की ओर प्राप्त सम्बेगों की प्रेरणा संज्ञा है तथा इसके विपरीत प्राप्त सम्वेगों की प्रतिक्रांति अथवा ह्वास संज्ञा है। धारणा के प्रतिकूल चेष्टा को अथवा समस्या की ओर प्राप्त विवशता की भी प्रतिक्रांति संज्ञा है।
उन्नति :- गुरु मूल्यन की ओर अथवा समाधान की ओर प्रगति ही उन्नति है।
सम्वेग :- संयोग से प्राप्त वेग ही सम्वेग है।
धारणा :- जिससे जिसका विलगीकरण संभव न हो, वह उसकी धारणा है। जो चारों पदों में अपने-अपने स्थिति के अनुसार स्पष्ट है।
समस्या :- किसी भी घटना अथवा क्रिया की समझ न होना ही समस्या है अथवा कैसे और क्यों समझ में न आना समस्या है।
समाधान :- किसी भी घटना अथवा क्रिया के नियम की समझ होना ही समाधान है अथवा कैसे और क्यों की पूर्ति ही समाधान है।
गुरुमूल्यन :- दीर्घ कालीन परिणाम अथवा अपरिणामिता गुरुमूल्यन है।

सहवास में ही प्रेरणा का प्रसव और अनुभव है तथा इसके विपरीत विवशता को प्रतिक्रांति की समीक्षा है।
प्रेरणावादी सहवास से उभय सुकृतियाँ प्रतिक्रांतिवादी सहवास से उभयविकृतियाँ हैं।
उभय सुकृतियाँ :- गुरुमूल्यन अथवा दीर्घ परिणाम या अपरिणामिता।
उभय विकृतियाँ :- अवमूल्यन की ओर द्रुत परिणाम या हास या समस्या की ओर द्रुत परिणाम ।

सहवास ही सृष्टि (रचना) का मूल कारण है। सहवास सहअस्तित्व में अभिव्यक्ति है । सहअस्तित्व नित्य वर्तमान व नित्य प्रभावी है।
संसार में अथवा अनंत संसार में ऐसी कोई इकाई नहीं है जो उत्थान या पतन की ओर गतित न हो क्योंकि गति रहित कोई इकाई नहीं है। अत: अनंत के लिये मात्र दो ही गतियाँ हैं।
ठोस पदार्थ राशि के नृत्य (तरंग) मिश्रण एवं यौगिक विधियों से समस्त रस एवं उपरस का प्रसव है।

पदार्थ राशि का वर्गीकरण चार जातियों में है :
. मृद्‌ (मिट्टी), 2. पाषाण, 3. मणि और 4. धातु।

मृद्‌ अथवा मिट्टी उर्वरा और अनुर्वरा भेद से है।
उर्वरा :- बीज को पाकर अनेक बीज को तैयार करने वाली क्षमता से सम्पन्न मिट्टी की उरवरा संज्ञा है तथा इससे विपरीत गुण स्वभाव वाली मिट्टी की अनुर्वरा' संज्ञा है।

पाषाण का वर्गीकरण कठोर एवं अकठोर भेद से है।
कठोर :- अधिक भार सहने वाले पाषाण की कठोर संज्ञा है।
अकठोर :- कम भार सहने वाले की अकठोर संज्ञा है।

मणि का वर्गीकरण किरण श्रावी एवं किरण ग्राही भेद से है।
किरण :- तप्त बिम्ब का प्रतिबिंबन अपारदर्शक वस्तु पर होना ही किरण है।
इकाई से बहिर्निहित अग्नि को ताप संज्ञा है।
किरण स्रावी :- किरण के प्रभाव से प्रसारण क्रिया करने वाले मणि को किरण स्रावी तथा ग्रहण करने वाले को किरण ग्राही संज्ञा है।
पारदर्शक एवं अपारदर्शक भेद से विकिरण और किरण क्रिया में रत है।
विकिरण :- किसी इकाई में अंतर्निहित अग्नि के प्रभाव से प्राप्त प्रसारण को विकिरण संज्ञा है।
रश्मि :- तप्त बिम्ब (प्रकाश के) प्रतिबिम्ब, अनुबिम्ब, प्रत्यानुबिम्ब क्रिया की रश्मि संज्ञा है।
प्रकाश :- इकाई के प्रतिबिम्बन की प्रकाश संज्ञा है ।
विकिरण एवं किरण माध्यम भेद से शोषण या पोषण क्रिया में रत है। प्राकृतिक विधि से पोषण स्पष्ट हो चुका है। भ्रमित मानव द्वारा विकिरणीय प्रयोग से शोषण सिद्ध हो चुका है।
पदार्थ राशि के संगठित पिण्ड की ग्रह-गोल संज्ञा है जिसके सभी ओर आकाश है।

प्रत्येक ग्रह आकाश में शून्याकर्षण की स्थिति में है। ऐसी हर इकाई अर्थात्‌ ग्रह-गोल आकाश में अपनी गति के अनुसार स्थिति है।
इकाईयाँ धनाकर्षण की स्थिति में किसी की ओर आकर्षित तथा ऋण-आकर्षण की स्थिति में किसी को आकर्षित करती है तथा शून्याकर्षण की स्थिति में स्वतंत्र है।

भार, आकर्षण से; आकर्षण, परस्परता से; परस्परता, लघुता एवं गुरुता से; लघुत्व एवं गुरुत्व, रचना एवं सापेक्ष ऊर्जाओं से; रचना एवं सापेक्ष ऊर्जा, क्रिया से; क्रिया, पदार्थ से और पदार्थ का हास एवं विकास सापेक्ष ऊर्जा के सदुपयोग एवं दुरूपयोग से सापेक्षित है।
समस्त पदार्थ निरपेक्ष ऊर्जा में संपकत व समाहित हैं तथा संपूर्ण सृष्टि की स्थिति तथा गति निरपेक्ष ऊर्जा में है।
प्रत्येक चेष्टा से सापेक्ष ऊर्जा का प्रसव है।
मूल चेष्टा के लिए निरपेक्ष ऊर्जा सबको प्राप्त है ही।
मूल चेष्टा :- पदार्थ के परमाण्विक स्थिति में वातावरण के दबाव से मुक्त चेष्टा की मूल चेष्टा संज्ञा है।
किसी भी भूमि पर पूर्ण सृष्टि तभी संभव है जब वह अपने में आवश्यक संपूर्ण रस, उपरस एवं वायु से समृद्ध हो जाये। इस प्रकार से इस असीम अवकाश में अनंत भूमि अपनी प्रगति के अनुसार पूर्ण-विकसित, अर्धविकसित, अल्प विकसित एवं अविकसित अवस्था में हैं। रस, उपरस का प्रमाण रासायनिक क्रियाकलाप और वैभव के रूप में है।
अविकसित सृष्टि पदार्थावस्था की सृष्टि है। समस्त मृद्‌, पाषाण, मणि एवं धातु की गणना अविकसित सृष्टि में है। अल्प-विकसित सृष्टि प्राणावस्था की सृष्टि है। समस्त वनस्पति प्राणावस्था की सृष्टि में सम्मिलित हैं। अर्ध-विकसित सृष्टि जो जीवावस्था की सृष्टि है। मानवेतर अण्डज और पिण्डज सृष्टि की गणना जीवावस्था में है। ज्ञानावस्था में शरीर रचना पूर्ण-विकसित सृष्टि है। यह स्पष्ट हो जाना आवश्यक है कि अल्प-विकसित सृष्टि में अविकसित सृष्टि; अर्ध-विकसित सृष्टि में अल्प-विकसित और अविकसित तथा पूर्ण-विकसित सृष्टि में अर्ध विकसित, अल्प-विकसित तथा अविकसित सृष्टि समाहित है ही क्योंकि गुरु मूल्य में लघु मूल्य समाया रहता है।
फलत: उच्चकोटि की सृष्टि में निम्न कोटि की सृष्टि के गुण, स्वभाव और धर्म विलय रहते ही हैं।
गुण :- सापेक्ष शक्तियों की गुण संज्ञा है। सम, विषम, मध्यस्थ के रूप में पहचान होती है, यही प्रभाव है ।
:- एक से अधिक एकत्र होने पर जो प्रभाव उत्पन्न होता है, उसे गुण की संज्ञा है।
स्वभाव :- मौलिकता ही स्वभाव है।
:- गुणों की उपयोगिता की स्वभाव संज्ञा है।
धर्म :- धारणा ही धर्म है।
सृष्टि का उपरोक्त वर्गीकरण कोष गठन भेद से है।
कोष :- आशय तथा प्रयोजन सहित निश्चित क्रिया विशेष को कोष संज्ञा है। प्रवृत्ति के लिए जिम्मेदार संपदा ही कोष है।
कोष का तात्पर्य सम्पन्नता से है। प्रेरणा सम्पन्नता का अर्थ है ऊर्जा सम्पन्नता, बल सम्पन्नता व चुम्बकीय बल सम्पन्नता। प्रेरणा सम्पन्नता ही प्राणमय कोष है। इसी प्रेरणा सम्पन्नता के आधार पर अंशों की परस्पर पहचान, निश्चित दूरी में नियन्त्रित रह कर परमाणु के रूप में प्रमाणित होता है। परमाणु में यह प्रवृत्ति ही प्राणमय कोष है।
अनंत रचनाएँ पाँच कोषों के गठन भेद के अंतर्गत परिलक्षित होती है। इन पाँच कोषों को क्रमश: प्राणमय कोष, अन्नमय कोष, मनोमय कोष, आनंदमय कोष और विज्ञानमय कोष संज्ञा है।

प्राणमय कोष, अन्नमय कोष व मनोमय कोष जड़ संसार में; तथा मनोमय कोष, आनंदमय कोष व विज्ञानमय कोष चेतन्य संसार में स्पष्ट अथवा प्रमाणित होते हैं।
अन्नमय कोष :- ग्रहण और विसर्जन करने वाले अंग की अन्नमय कोष संज्ञा है।
प्राणमय कोष :- प्रेरणा को स्वीकार अथवा अस्वीकार करने वाले अंग की प्राणमय कोष संज्ञा है।
मनोमय कोष :- चयन करने वाले अथवा चुनाव करने वाले अंग की मनोमय कोष संज्ञा है।
आनंदमय कोष :- सुख अथवा दुःख को व्यक्त करने वाले अंग की आनंदमय कोष संज्ञा है।
विज्ञानमय कोष :- विशेष ज्ञान को ग्रहण करने वाले अंग की विज्ञानमय कोष संज्ञा है।

कोष-प्रकाशन भेद से सृष्टि में अवस्था भेद पाया जाता है।
पदार्थावस्था की सृष्टि में अन्नमय कोष और प्राणमय कोष का प्रकाशन है। इन दो कोषों की क्रियाएँ समस्त पदार्थावस्था के मूल रूप परमाणुओं में पाई जाती है। प्रत्येक परमाणु सचेष्ट है, इसलिए उसमें प्रेरणा पाने वाला अंग सिद्ध है, इसके साथ ही परमाणु हास एवं विकास से मुक्त नहीं है, जो कि ग्रहण विसर्जन का ही प्रतिफल है। अत: पदार्थ में अन्नमय कोष भी सिद्ध हुआ । अन्नमय कोष की क्रियाशीलता भी चेष्टा का ही फल है अर्थात्‌ प्राणमय कोष के चेष्टित होने का फल ही है कि अन्नमय कोष की क्रिया भी संपादित होती है। अत: यह सिद्ध हुआ कि अन्नमय कोष और प्राणमय कोष का अविभाज्य संबंध है।
प्राणावस्था की सृष्टि में तीन कोषों का प्रकाशन है, यह है - अन्नमय कोष, प्राणमय कोष और मनोमय कोष । वनस्पतियों में पदार्थावस्था की सृष्टि की अपेक्षा चयनवादी क्रिया विशेष है, जो मनोमय-कोष की क्रिया है। यह इससे स्पष्ट होता है कि एक ही भूमि पर स्थित विभिन्‍न वनस्पतियाँ अपनी-अपनी आवश्यकतानुसार आवश्यकीय तत्वों एवं रसों को ग्रहण करते हुए पुष्ट होती देखी जाती हैं।
जीवावस्था व भ्रमित ज्ञानावस्था में चार कोषों की क्रिया स्पष्ट है। यह है - अन्नमय कोष, प्राणमय कोष, मनोमय कोष और आनंदमय कोष ।
आनंदमय कोष का विकास ही चैतन्यता का कारण है तथा इसी चेतन्यता के कारण जीवावस्था में सुख और दुःख का प्रकाशन है । इसके कारण ही जीवावस्था की इकाई को विषयों (आहार, निद्रा, भय और मैथुन) का सेवन करने का अधिकार है।
जागृत मानव में पाँच कोषों का प्रकाशन है, इन पाँचों कोषों की क्रियाशीलता व अभिव्यक्ति मानव में है। यह अन्नमय कोष, प्राणमय कोष, मनोमय कोष, आनंदमय कोष और विज्ञानमय कोष है।
विज्ञानमय कोष का जागृत होना ही ज्ञान, विज्ञान और विवेक के रूप में विशेष ज्ञान का कारण है, विवेक और विज्ञान द्वारा ही दुःख के कारण और निवारण की समझ विकसित होती है जिससे ही सुख, शांति, संतोष और आनंद की अनुभूति संभव है।

चारों अवस्थाओं की सृष्टि की अपनी विशेषताएँ हैं तथा विशिष्टताएँ रूप, गुण, स्वभाव और धर्म से संबंधित हैं।
रूप :- चारों अवस्थाओं की सृष्टि में रूप का निर्धारण आकार, आयतन और घनता के भेद से है।
गुण :- चारों अवस्थाओं में गुण सम, विषम अथवा मध्यस्थ के भेद से है।
:- सापेक्ष शक्तियों की गुण संज्ञा है अथवा एक से अधिक एकत्र होने पर जो प्रभाव उत्पन्न होता है उसे गुण संज्ञा है।
सम :- सृजन क्रिया में सहायक गुण को सम संज्ञा है।
विषम :- विसर्जन क्रिया में सहायक गुण को विषम संज्ञा है ।
मध्यस्थ :- विभव क्रिया में सहायक गुण को मध्यस्थ संज्ञा है ।
यह तीनों सृजन, विसर्जन तथा विभव की क्रिया ऊर्जामय हैं।
स्वभाव :- पदार्थ में संगठन-विघटन क्रियाएं तथा विघटन-संगठन क्रियाएं व उनकी निरंतरता स्वभाव है।
प्राणावस्था में सारक अथवा मारक या सारक-मारक क्रिया की निरंतरता स्वभाव है।
जीवावस्था में क्रूर, अक्रूर स्वभाव है।
ज्ञानावस्था में धीरता, वीरता और उदारता, दया, कृपा व करुणा स्वभाव है।
धर्म :- पदार्थावस्था में अस्तित्व धर्म है।
प्राणावस्था में अस्तित्व सहित पुष्टि धर्म है।
जीवावस्था में अस्तित्व, पुष्टि सहित जीने की आशा धर्म है।
ज्ञानावस्था में अस्तित्व, पुष्टि, जीने की आशा सहित सुख ही धर्म है।
यह ऊपर स्पष्ट किया जा चुका है कि उच्च कोटि की सृष्टि में निम्न कोटि की सृष्टि समाहित रहती है।

समस्त पदार्थ संगठन-विघटन एवं विघटन-संगठन क्रिया में अविरत गति से व्यस्त रहते हुये भौतिक एवं रासायनिक परिणाम को प्राप्त होते हैं।
प्राणावस्था की समस्त इकाईयाँ, पदार्थावस्था की सभी क्रियाओं सहित सप्राण, निष्प्राण, आरोह अथवा अवरोह क्रिया में अवस्थित होकर अथवा सारक-मारक स्वभाव सहित क्रिया में अभिव्यकत हैं ।
सारक :- प्राणपोषक वनस्पति की सारक संज्ञा है।
मारक :- प्राणशोषक वनस्पति की मारक संज्ञा है।
जीवावस्था की संपूर्ण शरीर रचना में पदार्थावस्था तथा प्राणावस्था की क्रियाएं समाहित हैं। यही उद्भव, विभव एवं प्रलय के रूप में स्पष्ट हैं। जीवावस्था में जीवन आहार, निद्रा, भय और मैथुन युक्त विषयों में आसक्त होकर रत है।
जीवावस्था का स्वभाव क्रूर-अक्रूर है।

ज्ञानावस्था की इकाईयों को, ऊपरवर्णित तीनों अवस्थाओं की क्रिया, स्वभाव, विषय तथा दृष्टि सहित वित्तेषणा, पुत्रेषणा एवं लोकेषणा से युक्त व्यवहार करते हुए धीरता, वीरता एवं उदारता पूर्ण आचरण के द्वारा ज्ञान, विवेक एवं विज्ञान का अध्ययन और प्रयोग का अवसर प्राप्त है जिसकी परिणति पूर्णता व अपूर्णता के आधार पर ही मानवीय या अमानवीय दृष्टि है।
धीरता :-न्याय के प्रति निष्ठा एवं दृढ़ता ही धीरता है।
वीरता :- दूसरों को न्याय उपलब्ध कराने में अपने बौद्धिक एवं भोतिक शक्तियों को नियोजित करने की प्रवृत्ति ही वीरता है।
उदारता :- अपनी सुख सुविधाओं को अर्थात्‌ तन, मन, धन को प्रसन्नता पूर्वक दूसरों के लिए उपयोगिता, सदउपयोगिता विधि से नियोजित करने की प्रवृत्ति ही उदारता है।
ज्ञान, विवेक एवं विज्ञान के अध्ययन एवं प्रयोग क्रम में ہی मानव क्रांत, भ्रान्ताभ्रान्त तथा निर्भ्रान्त स्थिति में स्पष्ट होता है।

सृष्टि में क्रिया अनन्त है एवं व्यापक सत्ता में सम्पूर्ण सृष्टि संपुक्त है।
प्रेरित होने के फलस्वरूप ही समस्त पदार्थ श्रम में रत है। श्रम के बिना कार्य कलाप फल परिणाम में हास एवं विकास सिद्ध नहीं होता ।
इसीलिए: -
पदार्थावस्था + श्रम = प्राणावस्था।
प्राणावस्था + श्रम = जीवावस्था ।
जीवावस्था + श्रम = भ्रमित ज्ञानावस्था।
भ्रमित ज्ञानावस्था + श्रम = विश्राम अर्थात्‌ सहअस्तित्व में अनुभूति ।
श्रम :- श्रम का तात्पर्य अधिक उन्नत अर्थात्‌ यथास्थिति से अधिक उन्नत यथास्थिति से है। ऐसी यथास्थिति विकास क्रम, जो कि भौतिक-रासायनिक वस्तुओं के रूप में है। विकास चैतन्य पद अथवा जीवन पद के रूप में अध्ययन सुलभ है। ऐसे जीवन जागृति क्रम, जागृति के रूप में अध्ययन, बोध व अनुभवगम्य है। अनुभवगम्य का अर्थ व्यवहार परम्परा में प्रमाणित होने से है ।
श्रम के क्षोभ के बराबर ही विश्राम की तृषा है क्योंकि ज्ञानावस्था में समस्त श्रम विश्राम सहज गन्तव्य, यथास्थिति और उसकी निरंतरता के लिये है।
`,
    },
    { id: 'mvd-4', title: 'अध्याय 4: मानव सहज प्रयोजन', content: 'Content for Chapter 4' },
    { id: 'mvd-5', title: 'अध्याय 5: निर्भ्रमता ही विश्राम', content: 'Content for Chapter 5' },
    { id: 'mvd-6', title: 'अध्याय 6: कर्म एवं फल', content: 'Content for Chapter 6' },
    { id: 'mvd-7', title: 'अध्याय 7: मानवीय व्यवहार', content: 'Content for Chapter 7' },
    { id: 'mvd-8', title: 'अध्याय 8: पद एवं पदातीत', content: 'Content for Chapter 8' },
    { id: 'mvd-9', title: 'अध्याय 9: दर्शन-दृश्य-दृष्टि', content: 'Content for Chapter 9' },
    { id: 'mvd-10', title: 'अध्याय 10: क्लेश-मुक्ति', content: 'Content for Chapter 10' },
    { id: 'mvd-11', title: 'अध्याय 11: योग', content: 'Content for Chapter 11' },
    { id: 'mvd-12', title: 'अध्याय 12: लक्षण, लोक, आलोक एवं लक्ष्य', content: 'Content for Chapter 12' },
    { id: 'mvd-13', title: 'अध्याय 13: मानवीयता', content: 'Content for Chapter 13' },
    { id: 'mvd-14', title: 'अध्याय 14: मानव व्यवहार सहज नियम', content: 'Content for Chapter 14' },
    { id: 'mvd-15', title: 'अध्याय 15: मानव सहज न्याय', content: 'Content for Chapter 15' },
    { id: 'mvd-16', title: 'अध्याय 16: पोषण एवं शोषण', content: 'Content for Chapter 16' },
    { id: 'mvd-17', title: 'अध्याय 17: रहस्य-मुक्ति', content: 'Content for Chapter 17' },
    { id: 'mvd-18', title: 'अध्याय 18: सुख-शान्ति-सन्तोष और आनन्द', content: 'Content for Chapter 18' },
  ];
  
export const MOCK_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'Manav Vyavahar Darshan',
    author: 'A. Nagraj',
    coverUrl: 'https://i.imgur.com/X54a3sN.jpg',
    description: 'The foundational text on human conduct in Madhyasth Darshan.',
    chapters: bookChapters.map((chapter) => {
        if (chapter.content.startsWith('Content for')) {
          let chapterTitle = chapter.title;
          let content = `Content for ${chapterTitle} from Manav Vyavahar Darshan will be displayed here.`;
          return { ...chapter, content };
        }
        return chapter;
    })
  },
  {
    id: 'b2',
    title: 'Jeevan Vidya: A Primer',
    author: 'A. Nagraj',
    coverUrl: 'https://madhyasth-darshan.info/wp-content/uploads/2019/07/JV-Primer-Cover-Hi-Res.jpg',
    description: 'An introductory text to the philosophy of Madhyasth Darshan (Jeevan Vidya).',
    chapters: [
      { id: 'c2-1', title: 'Introduction', content: 'Introductory content for Jeevan Vidya: A Primer.' },
    ],
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Anjali Sharma',
    avatarUrl: 'https://picsum.photos/seed/anjali/200/200',
    city: 'Mumbai',
    country: 'India',
    studyLevel: 'Foundation',
    interests: ['Consciousness', 'Philosophy', 'Yoga'],
    bio: 'Student of Jeevan Vidya, exploring the nature of reality and human purpose. Loves hiking and reading.'
  },
  {
    id: 'u2',
    name: 'David Chen',
    avatarUrl: 'https://picsum.photos/seed/david/200/200',
    city: 'San Francisco',
    country: 'USA',
    studyLevel: 'Exploration',
    interests: ['Coexistence', 'Systems Thinking', 'Education'],
    bio: 'Facilitator with 5+ years of experience in Madhyasth Darshan workshops. Passionate about bringing clarity to complex topics.'
  },
  {
    id: 'u3',
    name: 'Maria Garcia',
    avatarUrl: 'https://picsum.photos/seed/maria/200/200',
    city: 'Madrid',
    country: 'Spain',
    studyLevel: 'Reflection',
    interests: ['Family', 'Relationships', 'Psychology'],
    bio: 'New to the study, trying to apply these principles in my daily family life. Looking to connect with others on a similar journey.'
  },
  {
    id: 'u4',
    name: 'Kenji Tanaka',
    avatarUrl: 'https://picsum.photos/seed/kenji/200/200',
    city: 'Tokyo',
    country: 'Japan',
    studyLevel: 'Integration',
    interests: ['Holistic Living', 'Nature', 'Mindfulness'],
    bio: 'Integrating the philosophy into my work as an architect, focusing on sustainable and harmonious design.'
  },
];

export const COMMUNITY_CONTACTS: User[] = [
  { id: 'c-ap-1', name: 'Pradeep R', avatarUrl: 'https://picsum.photos/seed/pradeepr/200/200', city: 'Hyderabad (IIIT)', state: 'Andhra Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9391131199, Email: ramancharla@iiit.ac.in' },
  { id: 'c-cg-1', name: 'Surendra Pal', avatarUrl: 'https://picsum.photos/seed/surendrapal/200/200', city: 'Raipur', state: 'Chhattisgarh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9725025307, Email: surendrapal@hotmail.com' },
  { id: 'c-cg-2', name: 'Chandrashekhar', avatarUrl: 'https://picsum.photos/seed/chandrashekhar/200/200', city: 'Achoti', state: 'Chhattisgarh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9893013341, Email: rathore.civil@gmail.com' },
  { id: 'c-gj-1', name: 'Suresh Patel', avatarUrl: 'https://picsum.photos/seed/sureshpatel/200/200', city: 'Ahmedabad', state: 'Gujarat', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9727682693, Email: sureshbhaipatel@yahoo.com' },
  { id: 'c-gj-2', name: 'Ajay Jain', avatarUrl: 'https://picsum.photos/seed/ajayjain/200/200', city: 'Surat', state: 'Gujarat', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9824304935, Email: akj01936@yahoo.com' },
  { id: 'c-ka-1', name: 'Rakesh Gupta', avatarUrl: 'https://picsum.photos/seed/rakeshgupta/200/200', city: 'Bangalore', state: 'Karnataka', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9611509219, Email: rakesh2715@gmail.com' },
  { id: 'c-ka-2', name: 'Sanjeev Patil', avatarUrl: 'https://picsum.photos/seed/sanjeevpatil/200/200', city: 'Vijaypura (Bijapur)', state: 'Karnataka', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9448231960, Email: tarangscientificinstruments@gmail.com' },
  { id: 'c-mp-1', name: 'Sharada Amba', avatarUrl: 'https://picsum.photos/seed/sharadaamba/200/200', city: 'Amarkantak', state: 'Madhya Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9425344128' },
  { id: 'c-mp-2', name: 'Anand Dammani', avatarUrl: 'https://picsum.photos/seed/ananddammani/200/200', city: 'Indore', state: 'Madhya Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9770127272, Email: anand@galaxyweblinks.com' },
  { id: 'c-mh-1', name: 'Shriram Narasimhan', avatarUrl: 'https://picsum.photos/seed/shriramn/200/200', city: 'Pune', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9907794154, Email: zshriram@gmail.com' },
  { id: 'c-mh-2', name: 'Suvarna Shastri', avatarUrl: 'https://picsum.photos/seed/suvarnas/200/200', city: 'Pune', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9630300787' },
  { id: 'c-mh-3', name: 'Sachin Mote', avatarUrl: 'https://picsum.photos/seed/sachinmote/200/200', city: 'Buldhana', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9404508107' },
  { id: 'c-mh-4', name: 'Mangesh Shastri', avatarUrl: 'https://picsum.photos/seed/mangeshs/200/200', city: 'Mumbai', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9821046342' },
  { id: 'c-mh-5', name: 'Uddhav Rathod', avatarUrl: 'https://picsum.photos/seed/uddhavr/200/200', city: 'Chandrapur', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9158033290' },
  { id: 'c-mh-6', name: 'Rahul Tayde', avatarUrl: 'https://picsum.photos/seed/rahult/200/200', city: 'Yeotmal', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9860774810' },
  { id: 'c-mh-7', name: 'Rekha Raut', avatarUrl: 'https://picsum.photos/seed/rekharaut/200/200', city: 'Akola', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9850156255' },
  { id: 'c-mh-8', name: 'Radheshyam', avatarUrl: 'https://picsum.photos/seed/radheshyam/200/200', city: 'Aurangabad', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 8888855410' },
  { id: 'c-mh-9', name: 'Shalini Arora', avatarUrl: 'https://picsum.photos/seed/shalinia/200/200', city: 'Nagpur', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9422805479' },
  { id: 'c-dl-1', name: 'Sanjeev Chopra', avatarUrl: 'https://picsum.photos/seed/sanjeevchopra/200/200', city: 'New Delhi', state: 'NCR Delhi', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9811141311' },
  { id: 'c-od-1', name: 'Gopal Agrawal', avatarUrl: 'https://picsum.photos/seed/gopalagrawal/200/200', city: 'Bargarh', state: 'Odisha', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9437052363, Email: gopal_bgh@yahoo.com' },
  { id: 'c-rj-1', name: 'Himansu Dugar', avatarUrl: 'https://picsum.photos/seed/himansudugar/200/200', city: 'Sardar Shahar', state: 'Rajasthan', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9602411441, Email: hdugar1@rediffmail.com' },
  { id: 'c-rj-2', name: 'Aniruddh Vaishnav', avatarUrl: 'https://picsum.photos/seed/aniruddhv/200/200', city: 'Bhilwara', state: 'Rajasthan', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9461263130' },
  { id: 'c-tn-1', name: 'Senthil', avatarUrl: 'https://picsum.photos/seed/senthil/200/200', city: 'Salem', state: 'Tamil Nadu', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9566876633' },
  { id: 'c-up-1', name: 'Abhishek Kumar', avatarUrl: 'https://picsum.photos/seed/abhishekk/200/200', city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9795781862, Email: abhishkr@gmail.com' },
  { id: 'c-up-2', name: 'Ransingh Arya', avatarUrl: 'https://picsum.photos/seed/ransingha/200/200', city: 'Bijnore', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9412218178, Email: msyatra@gmail.com' },
  { id: 'c-up-3', name: 'Sanjeev Chopra', avatarUrl: 'https://picsum.photos/seed/sanjeevchopra2/200/200', city: 'Hapud', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9412218178, Email: schopra45@yahoo.com' },
  { id: 'c-up-4', name: 'Prem Singh', avatarUrl: 'https://picsum.photos/seed/premsingh/200/200', city: 'Banda', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9415557444, Email: farmerprem@gmail.com' },
  { id: 'c-br-1', name: 'Yogesh', avatarUrl: 'https://picsum.photos/seed/yogesh/200/200', city: 'Patna (NIT)', state: 'Bihar', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9410478242, Email: yogesh.me@nitp.ac.in' },
  { id: 'c-jh-1', name: 'Ramashankar', avatarUrl: 'https://picsum.photos/seed/ramashankar/200/200', city: 'Deoghar', state: 'Jharkhand', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9110935465' },
  { id: 'c-ca-1', name: 'Mahendra & Naomi', avatarUrl: 'https://picsum.photos/seed/mahendranaomi/200/200', city: 'Ontario', state: 'Ontario', country: 'Canada', studyLevel: 'Foundation', interests: [], bio: 'Phone: +18185338268' },
];


export const MOCK_THREADS: Thread[] = [
  {
    id: 't1',
    title: 'Understanding the difference between "Knowing" and "Assuming"',
    body: 'I\'ve been pondering the distinction Madhyasth Darshan makes between knowing (jaan-na) and assuming (maan-na). It seems simple on the surface, but the implications are profound. How has this distinction impacted your daily life and decision-making?\n\nFor me, I realize how much of my life is based on assumptions passed down through family and society. It\'s a bit unsettling but also liberating. Looking forward to hearing your thoughts.',
    author: MOCK_USERS[2],
    tags: ['Knowing vs Assuming', 'Jeevan Vidya', 'Self-Exploration'],
    createdAt: '2 days ago',
    resonates: 15,
    replies: [
      {
        id: 'r1',
        author: MOCK_USERS[1],
        body: 'Great question, Maria. This is a foundational point. For me, the shift happened when I started verifying my assumptions against reality, both within myself and in my interactions. It requires a lot of patience and honesty.',
        createdAt: '2 days ago',
        parentId: null
      },
      {
        id: 'r2',
        author: MOCK_USERS[0],
        body: 'I agree with David. It\'s an ongoing process. I find that when I operate from "knowing" (based on my own understanding), my actions are more confident and harmonious. When it\'s just an assumption, there\'s always a subtle undercurrent of doubt or fear.',
        createdAt: '1 day ago',
        parentId: 'r1'
      }
    ]
  },
  {
    id: 't2',
    title: 'Practical application of "Coexistence" in the workplace',
    body: 'My workplace can be very competitive. I\'m struggling to see how the principle of "Coexistence" applies in an environment that seems to reward individual achievement above all else. Has anyone successfully navigated this? Any practical tips or experiences to share?',
    author: MOCK_USERS[0],
    tags: ['Coexistence', 'Workplace', 'Relationships'],
    createdAt: '5 days ago',
    resonates: 8,
    replies: [
        {
            id: 'r3',
            author: MOCK_USERS[1],
            body: 'It\'s definitely a challenge. One small thing I started doing was genuinely appreciating my colleagues\' contributions, even when they "win". It shifted my perspective from a zero-sum game to seeing us as part of a larger system. It didn\'t change the company culture overnight, but it changed my own inner state significantly.',
            createdAt: '4 days ago',
            parentId: null
        }
    ]
  },
  {
    id: 't3',
    title: 'Explaining "Consciousness" (Chaitanya) to a complete beginner',
    body: 'A friend asked me to explain what "Consciousness" or "Chaitanya" means in this philosophy, and I struggled to put it into simple terms without using jargon. How would you explain it? What analogies have you found helpful?',
    author: MOCK_USERS[3],
    tags: ['Consciousness', 'Jargon', 'Teaching'],
    createdAt: '7 days ago',
    resonates: 12,
    replies: [
      {
        id: 'r4',
        author: MOCK_USERS[0],
        body: "I usually start with the idea of 'the observer' or 'the knower' within us. The part that is aware of thoughts, feelings, and the body, but isn't any of those things. It's a starting point, at least!",
        createdAt: '6 days ago',
        parentId: null
      }
    ]
  },
  {
    id: 't4',
    title: 'What does "Resolution" (Samadhan) look like in family life?',
    body: 'The books talk a lot about achieving "Samadhan" or Resolution. I understand it intellectually, but what are some tangible examples of what this looks like in the day-to-day chaos of family life? I\'m particularly interested in how it changes communication during disagreements.',
    author: MOCK_USERS[0],
    tags: ['Resolution', 'Family', 'Relationships', 'Samadhan'],
    createdAt: '10 days ago',
    resonates: 22,
    replies: []
  },
  {
    id: 't5',
    title: 'The role of Nature in our understanding',
    body: 'I find that spending time in nature really helps me connect with the concepts of orderliness, harmony, and coexistence. It feels like a living demonstration of the philosophy. Does anyone else use observations of nature as a tool for their own study and reflection? What have you observed?',
    author: MOCK_USERS[1],
    tags: ['Nature', 'Harmony', 'Coexistence', 'Observation'],
    createdAt: '12 days ago',
    resonates: 18,
    replies: [
      {
        id: 'r5',
        author: MOCK_USERS[3],
        body: 'Absolutely. As an architect, I see the perfect resource management and symbiotic relationships in a forest ecosystem. There is no waste. It\'s a huge inspiration for sustainable design and a reminder of the inherent orderliness in existence.',
        createdAt: '11 days ago',
        parentId: null
      },
      {
        id: 'r6',
        author: MOCK_USERS[2],
        body: 'I love that perspective, Kenji. For me, it\'s as simple as watching my garden. The way plants grow towards the sun, the bees pollinating... it\'s all a quiet dance of purpose and mutual fulfillment.',
        createdAt: '10 days ago',
        parentId: 'r5'
      }
    ]
  }
];

export const MOCK_ROADMAP: RoadmapLevel[] = [
  {
    id: 'l1',
    title: 'Foundation',
    subtitle: 'Understanding the basic proposals of Madhyasth Darshan.',
    steps: [
      {
        id: 's1-1',
        title: 'Introduction to Jeevan Vidya',
        type: 'video',
        description: 'Watch an introductory series of talks on the core concepts of the philosophy.',
        link: 'https://www.youtube.com/playlist?list=PLq-nEFx3fJcEDYs49j0TfW-3qsT582aW3'
      },
      {
        id: 's1-2',
        title: 'Reading: "Manav Vyavahar Darshan"',
        type: 'reading',
        description: 'Begin reading the foundational text on human conduct.'
      },
      {
        id: 's1-3',
        title: 'Weekly Reflection Journal',
        type: 'reflection',
        description: 'At the end of each week, write down one key insight and how it relates to your daily experiences.'
      }
    ]
  },
  {
    id: 'l2',
    title: 'Reflection',
    subtitle: 'Internalizing concepts through self-observation.',
    steps: [
      {
        id: 's2-1',
        title: 'Activity: Observe Your Reactions',
        type: 'activity',
        description: 'For one week, consciously observe your emotional reactions without judgment. Note the triggers and the underlying assumptions.'
      },
      {
        id: 's2-2',
        title: 'Reading: "Karm Darshan"',
        type: 'reading',
        description: 'Study the text related to action (Karma) and its results.'
      },
    ]
  },
  {
    id: 'l3',
    title: 'Exploration',
    subtitle: 'Discussing and verifying proposals with others.',
    steps: [
      {
        id: 's3-1',
        title: 'Join a Study Group',
        type: 'activity',
        description: 'Engage in a weekly study circle to discuss your readings and reflections with peers.'
      },
      {
        id: 's3-2',
        title: 'Video Series: Deep Dive on Consciousness',
        type: 'video',
        description: 'Watch advanced talks on the nature of the Self (Jeevan) and Consciousness.',
      },
    ]
  },
  {
    id: 'l4',
    title: 'Integration',
    subtitle: 'Living in harmony based on understanding.',
    steps: [
      {
        id: 's4-1',
        title: 'Activity: Mentoring',
        type: 'activity',
        description: 'Share your understanding by helping facilitate a study group for beginners.'
      },
      {
        id: 's4-2',
        title: 'Reflection: The Undivided Society',
        type: 'reflection',
        description: 'Contemplate on your role and contribution towards creating a harmonious, undivided society.'
      },
    ]
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e4',
    title: 'अष्टम त्रि-वर्षीय अध्ययन अभ्यास सत्र',
    description: 'A three-year study and practice session.',
    type: 'Offline',
    startDate: '10/07/2025',
    endDate: '26/07/2028',
    location: 'Kiritpur, Post, Ranka, Chhattisgarh',
    host: MOCK_USERS[1],
    category: 'B1. Adhyayan Shivir (Pustak)',
    organizer: 'Multiple',
    language: 'Hindi [ हिन्दी ]',
  },
  {
    id: 'e1',
    title: '7-Day Introductory Workshop on Jeevan Vidya',
    description: 'An immersive online workshop covering the foundational principles of Madhyasth Darshan. Ideal for beginners.',
    type: 'Online',
    startDate: 'October 15, 2024',
    endDate: 'October 21, 2024',
    location: 'Zoom',
    host: MOCK_USERS[1],
    category: 'C2. Workshop (Introductory)',
    organizer: MOCK_USERS[1].name,
    language: 'English & Hindi',
  },
  {
    id: 'e2',
    title: 'Mumbai Study Circle Meetup',
    description: 'A monthly offline gathering for students in the Mumbai area to discuss texts and share experiences.',
    type: 'Offline',
    startDate: 'October 26, 2024',
    endDate: '',
    location: 'Andheri Community Hall, Mumbai',
    host: MOCK_USERS[0],
    category: 'A1. Study Circle',
    organizer: 'Mumbai Study Group',
    language: 'Hindi',
  },
  {
    id: 'e3',
    title: 'Advanced Course: "Manav Abhyas Darshan"',
    description: 'A deep-dive course for experienced students focusing on the text related to human practice and experience.',
    type: 'Online',
    startDate: 'November 5, 2024',
    endDate: 'November 9, 2024',
    location: 'Google Meet',
    host: MOCK_USERS[3],
    category: 'B2. Advanced Course',
    organizer: MOCK_USERS[3].name,
    language: 'English',
  }
];

// Add the initial notes with start and end positions for accurate highlighting
export const INITIAL_NOTES: Note[] = [
    {
      id: 'note-1',
      chapterId: 'mvd-1',
      selectedText: 'सहअस्तित्व में अनुभव ही ज्ञान का उद्घाटन है।',
      noteText: 'This seems to be the core principle. Everything starts from understanding coexistence.',
      start: 1801,
      end: 1842
    }
];