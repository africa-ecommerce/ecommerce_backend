// Complete mapping from shorter addresses to full terminal details
const terminalMapping = {
  // Abia
  "Asa Road, Former NITEL Building, Aba": {
    fullAddress: "Asa Road, Former NITEL Building, Aba",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },
  "G.R.A, After Jevinic Restaurant, Aba": {
    fullAddress: "30 Brass Street, G.R.A, After Jevinic Restaurant, Aba",
    openingHours: "Monday-Saturday: 8:00am- 7:00pm, Sunday: Closed",
  },
  "Opposite Villaroy Hotel, Umuahia Main Town": {
    fullAddress: "8 Mission Hill, Opposite Villaroy Hotel, Umuahia Main Town",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Close to MTN Office, Aba Road, Umuahia": {
    fullAddress: "60 Aba Road, Close to MTN Office, Aba Road, Umuahia",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },

  // Federal Capital Territory (Abuja)
  "Ademola Adetokunbo Crescent, Wuse 2": {
    fullAddress:
      "12 Nurnberger Platz, By Lobito junction, Ademola Adetokunbo Crescent, Before Transcorp Hilton, Wuse 2",
    openingHours: "Monday-Saturday: 7:30am - 8:00pm, Sunday: Closed",
  },
  "Area 1 Shopping Plaza, Area 1, Abuja": {
    fullAddress: "SH 034, Area 1 Shopping Plaza, Area 1, Abuja",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "Beside Lifemate Furniture, Area 11, Garki": {
    fullAddress:
      "SICCONS Plaza, Opposite Unity House, Beside Lifemate Furniture, Area 11, Garki",
    openingHours: "Monday-Saturday: 7:30am - 8:00pm, Sunday: Closed",
  },
  "3rd Avenue Gwarinpa, Opposite Union Bank, Abuja": {
    fullAddress: "House 38, 3rd Avenue Gwarinpa, Opposite Union Bank, Abuja",
    openingHours: "Monday-Saturday: 7:00am - 7:00pm, Sunday: Closed",
  },
  "Opposite DIVIB Plaza, By 7th Avenue Junction, Gwarinpa": {
    fullAddress:
      "Suite A1, Bricks and More Plaza, 4th Avenue, Opposite DIVIB Plaza, By 7th Avenue Junction, Gwarinpa",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Opposite Aso-Oke Hotel, Gwagwalada": {
    fullAddress:
      "Secretariat Road Beside WAEC, Opposite Aso-Oke Hotel, Gwagwalada",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Gado Nasko Way, Along El-Rufai Bus Stop, Kubwa": {
    fullAddress:
      "Opposite 2/2 Court Junction, Block 43, Gado Nasko Way, Along El-Rufai Bus Stop, Kubwa",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Plot 17, Gidan Dutse Layout, Kubwa": {
    fullAddress: "Opposite Ignobis Hotel, Plot 17, Gidan Dutse Layout, Kubwa",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Kukwaba General Park, Kubwa": {
    fullAddress: "Kukwaba General Park, Kubwa",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: Closed",
  },
  "Beside Remaco Filling Station, Lugbe": {
    fullAddress:
      "Shepherd-King Plaza, Beside Remaco Filling Station, By Police Signboard, Lugbe",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Along Zuba Expressway, Madalla": {
    fullAddress: "Mobil Filling Station, Along Zuba Expressway, Madalla",
    openingHours: "Monday-Saturday: 7:00am - 7:00pm, Sunday: Closed",
  },
  "Opposite Chrisgold Plaza, Beside MTN Office, Mararaba": {
    fullAddress:
      "132 Giza Plaza, Opposite Chrisgold Plaza, Beside MTN Office, Mararaba",
    openingHours: "Monday-Saturday: 7:00am - 7:00pm, Sunday: Closed",
  },
  "Along Nyanya-Jikwoyi Road, Nyanya, Abuja": {
    fullAddress:
      "Joy plaza, Beside First Bank, Along Nyanya-Jikwoyi Road, Nyanya, Abuja",
    openingHours: "Monday-Saturday: 7:35am - 7:00pm, Sunday: Closed",
  },
  "Beside Utako Police Station, Utako, Abuja": {
    fullAddress:
      "Plot 113, I.V.W. Osisiogu Street, Beside Utako Police Station, Utako, Abuja",
    openingHours: "Monday-Saturday: 24hrs, Sunday: 24hrs",
  },
  "Off Obafemi Awolowo Expressway, Utako, Abuja": {
    fullAddress:
      "Suite 3&4 Atlantic Mall, Ajose Adeogun Street, Off Obafemi Awolowo Expressway, Utako, Abuja",
    openingHours: "Monday-Saturday: 7:30am - 8:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Beside Wema Bank Banex, Wuse 2": {
    fullAddress:
      "80 Aminu Kano Crescent, Opposite Sherif Plaza, Beside Wema Bank Banex, Wuse 2",
    openingHours: "Monday-Saturday: 7:30am - 8:00pm, Sunday: Closed",
  },
  "Opposite Lagos Line, Zuba": {
    fullAddress: "206 Zuba Market, Opposite Lagos Line, Zuba",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Adamawa
  "Fire Service Roundabout, Jimeta, Yola": {
    fullAddress:
      "Plot 2, Bekaji Plaza, Bekaji Karewa Road, By Fire Service Roundabout, Jimeta, Yola",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Anambra
  "Crunchies Fries, Enugu/Onitsha Expressway, Awka": {
    fullAddress:
      "Elite Shopping Complex, Opposite Crunchies Fries, Enugu/Onitsha Expressway, Awka",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 6:00am - 3:00pm",
  },
  "The Salvation Army Church, Umudim, Nnewi": {
    fullAddress:
      "73 Owerri Road, Martina Chukwuma Plaza (Innoson Plaza), Opposite The Salvation Army Church, Umudim, Nnewi",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "All Saints' Anglican Cathedral, Onitsha": {
    fullAddress:
      "2 Awka Road, By DMGS Junction, Beside All Saints' Anglican Cathedral, Onitsha",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: 10:00am - 3:00pm",
  },

  // Akwa Ibom
  "Opposite Royalty Hotel, Eket": {
    fullAddress: "92 Marina Road, Opposite Royalty Hotel, Eket",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Itam industrial Layout, Opposite Timber Market, Itam": {
    fullAddress:
      "3 Monsignor Akpan Avenue, Itam industrial Layout, Opposite Timber Market, Itam",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Beside First Bank, Uyo": {
    fullAddress: "108 Oron Road, Beside First Bank, Uyo",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },

  // Bauchi
  "Opposite Gwaram and Sons Plaza, Yandoka Road, Bauchi": {
    fullAddress:
      "Shop 7, Mai Jama'a Plaza, Opposite Gwaram and Sons Plaza, Yandoka Road, Bauchi",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Bayelsa
  "Opposite Wema Bank, By INEC Junction, Yenogoa": {
    fullAddress: "Kpansia Epia, Opposite Wema Bank, By INEC Junction, Yenogoa",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Tamic Road Junction, Okutukutu, Yenegoa": {
    fullAddress:
      "Beside Phone Headquarters, Tamic Road Junction, Okutukutu, By Express, Yenegoa",
    openingHours: "Monday-Saturday: 7:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },

  // Benue
  "Opposite Dester, By Savannah Roundabout, Makurdi": {
    fullAddress: "4 Old Otukpo Road, Opposite Dester's, By Savannah Roundabout",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Borno
  "Opposite Elkanemi College, Jos Road, Maiduguri": {
    fullAddress:
      "10A Golden Plaza, Opposite Elkanemi College of Islamic Theology, Jos Road, Maiduguri",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Cross River
  "29 Ndidem Usang Iso Road, Calabar": {
    fullAddress: "29 Ndidem Usang Iso Road (aka Marian Road), Calabar",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Beside UNICAL, Opposite MTN Office, Calabar": {
    fullAddress:
      "74 Eta Agbor Road, Beside UNICAL, Opposite MTN Office, Calabar",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },

  // Delta
  "Asaba-Onitsha Expressway, By Head Bridge": {
    fullAddress: "Asaba-Onitsha Expressway, By Head Bridge",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Opposite Zenith Bank, Asaba": {
    fullAddress: "445 Nnebisi Road, Opposite Zenith Bank, Asaba",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Okpanam Road, Asaba": {
    fullAddress: "Suite 53/54 Independence Mall, Okpanam Road, Asaba",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Off Ughelli-Warri Expressway, Ughelli": {
    fullAddress: "6B Uduere/Agbara Road, Off Ughelli-Warri Expressway, Ughelli",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Effurun, Opposite Our Ladies High School": {
    fullAddress:
      "116 Effurun-Sapele Warri Road, Effurun, Opposite Our Ladies High School",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "128 Effurun-Sapele Road, Opposite Solidas, By 7UP Bus Stop": {
    fullAddress:
      "Shop 5, Eku Plaza, 128 Effurun-Sapele Road, Opposite Solidas, Adjacent PZ Cussons, By 7UP Bus Stop",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Ebonyi
  "Opposite International Market, Abakaliki": {
    fullAddress: "Central Park, Opposite International Market, Abakaliki",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 7:00am-3:00pm",
  },

  // Edo
  "Omegatron Plaza, 47 Airport Road, Benin City": {
    fullAddress: "Shop 1, Omegatron Plaza, 47 Airport Road, Benin City",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "112 Akpakpava Road, Benin City": {
    fullAddress: "112 Akpakpava Road, Benin City",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Opposite Auchi Polytechnic Sport Complex, Auchi-Okene Expressway, Auchi": {
    fullAddress:
      "Opposite Auchi Polytechnic Sport Complex, Beside Hostel Gate, Auchi-Okene Expressway, Auchi, Edo state",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Along Benin-Auchi Expressway, Beside Big Joe Park, Ekpoma": {
    fullAddress: "Along Benin-Auchi Expressway, Beside Big Joe Park, Ekpoma",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "42 Benin-Agbor Road, EcoBus Park, Ramat, Benin City": {
    fullAddress: "42 Benin-Agbor Road, EcoBus Park, Ramat, Benin City",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Beside Genesis Restaurant, Opposite Uwa Junction, Benin City": {
    fullAddress:
      "131 Benin Sapele Road, Beside Genesis Restaurant, Opposite Uwa Junction, Benin City",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "202 Uselu-Lagos Road, Ugbowo, Benin City": {
    fullAddress: "202 Uselu-Lagos Road, Ugbowo, Benin City",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },

  // Ekiti
  "Soladola Filling Station, Beside APC Secretariat, Along Ikere Road, Ajilosun":
    {
      fullAddress:
        "Soladola Filling Station, Beside APC Secretariat, Opposite Moferere Junction, Along Ikere Road, Ajilosun",
      openingHours: "Monday-Saturday: 7:30am - 6:30pm, Sunday: Closed",
    },

  // Enugu
  "Opposite Osisatech Polytechnic, Enugu": {
    fullAddress:
      "No. 1 P & T Quarters, Market Road, Opposite Osisatech Polytechnic, Enugu",
    openingHours: "Monday-Saturday: 7:00am - 7:00pm, Sunday: 7:00am - 3:00pm",
  },
  "67 Zik Avenue, Uwani, Enugu": {
    fullAddress: "67 Zik Avenue, Uwani, Enugu",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: 8:00am - 3:00pm",
  },
  "64 Owerrani, Enugu Road, Nsukka": {
    fullAddress: "64 Owerrani, Enugu Road, Nsukka",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 7:00am - 3:00pm",
  },

  // Gombe
  "Along FTH/Police Headquarters, Ashaka Road, Gombe": {
    fullAddress:
      "Shop 4, El-Zaks Plaza, Opposite Conoil Filling Station, Along FTH/Police Headquarters, Ashaka Road, Gombe",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Imo
  "Relief Road, By Relief Junction, Off Egbu Road, Owerri": {
    fullAddress:
      "Plot C31, Relief Road, By Relief Junction, Off Egbu Road, Owerri",
    openingHours: "Monday-Saturday: 6:30am - 7:30pm, Sunday: 7:00am - 3:00pm",
  },
  "Odonko Plaza, No. 7 Nwaturuocha Street, Ikenegbu, Owerri": {
    fullAddress: "Odonko Plaza, No. 7 Nwaturuocha Street, Ikenegbu, Owerri",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Along Umuguma Road (World Bank Last Roundabout), New Owerri": {
    fullAddress:
      "Shop 9, Lion Yard Plaza, Plot 26A/26B, Federal Housing Estate, Along Umuguma Road (World Bank Last Roundabout), New Owerri",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Jigawa
  "Government House Roundabout, Asamau House, Dutse": {
    fullAddress:
      "Government House Roundabout, Asamau House, Block B, Number 8, By Airtel Office, Dutse, Jigawa State",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Kaduna
  "Jos Road Plaza, 19/20 Jos Road, By Ahmadu Bello Way, Kaduna": {
    fullAddress: "Jos Road Plaza, 19/20 Jos Road, By Ahmadu Bello Way, Kaduna",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Opposite Kaduna Old Airport Road, Kaduna": {
    fullAddress:
      "Shop A04, No. 6 Gidanbu Plaza, Kaduna-to-Lagos Road, Opposite Kaduna Old Airport Road, Kaduna",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Nnamdi Azikiwe Expressway, By Command Junction": {
    fullAddress:
      "Nnamdi Azikiwe Expressway, By Command Junction, Close to Samrada Filling Station (Beside 911 Bakery)",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Beside Shagalinku London Hotel, Sabon Gari, Zaria": {
    fullAddress:
      "Shop 2, D2 Plaza, No. 18 Sokoto Road, Beside Shagalinku London Hotel, After MTD Junction, Sabon Gari, Zaria",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Kano
  "By Tafawa Balewa Way, Opposite Domino's Pizza, Kano": {
    fullAddress:
      "1 Bompai Road, By Tafawa Balewa Way, Opposite Domino's Pizza, Kano",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Centro Plaza, Opposite BUK Old Site, Kabuga, Kano": {
    fullAddress:
      "Shop 2 & 3, Centro Plaza, Opposite BUK Old Site, Kabuga, Kano",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Zaria Road, Opposite Kano State House of Assembly": {
    fullAddress:
      "Khadijah House, Zaria Road, Opposite Kano State House of Assembly",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Katsina
  "Abudullahi Sarki Muktar Road, Near Tukur Jikamshi Residence, Katsina": {
    fullAddress:
      "Abudullahi Sarki Muktar Road, Along Kiddies Roundabout, Near Tukur Jikamshi Residence, Katsina",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: Closed",
  },

  // Kebbi
  "Opposite Alhaji Boye Coca-Cola Depot, Birnin Kebbi": {
    fullAddress:
      "Ahmadu Bello Way, Opposite Alhaji Boye Coca-Cola Depot, Birnin Kebbi, Kebbi state",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Kogi
  "Lokoja, Close to Federal Medical Center": {
    fullAddress: "1 IBB Way, Adankolo, Lokoja, Close to Federal Medical Center",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Kwara
  "Adjacent Chicken Republic, Ilorin": {
    fullAddress:
      "151 Ibrahim Taiwo Road (Upper Taiwo), Adjacent Chicken Republic, Ilorin",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "34B University of Ilorin Road, Tanke, Ilorin": {
    fullAddress:
      "34B University of Ilorin Road, Beside Reo Cakes Plaza, Tanke, Ilorin",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Lagos (All terminals)
  "568 Abeokuta Expressway, Ajala Bus Stop, Abule-Egba": {
    fullAddress: "568 Abeokuta Expressway, Ajala Bus Stop, Abule-Egba",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Tripple Ace Dew Building, Opposite Enyo Filling Station, Addo Road": {
    fullAddress:
      "Tripple Ace Dew Building, Opposite Enyo Filling Station, Addo Road",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: Closed",
  },
  "Morogbo, Along Badagry Expressway, Agbara": {
    fullAddress:
      "Agbeke Filling Station, Morogbo, Along Badagry Expressway, Agbara, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "KM 25, Lekki-Epe Expressway, Ajiwe-Ajah": {
    fullAddress: "KM 25, Lekki-Epe Expressway, Ajiwe-Ajah",
    openingHours: "Monday-Saturday: 24hours, Sunday: 24hours",
  },
  "KM 22, Lekki-Epe Expressway, By Abraham Adesanya Roundabout, Ajah": {
    fullAddress:
      "KM 22, Lekki-Epe Expressway, Opposite Jeffrey's Plaza, By Abraham Adesanya Roundabout, Ajah",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: 9:00am - 3:00pm",
  },
  "41 Shasha Road, Akowonjo Junction, Dopemu": {
    fullAddress: "41 Shasha Road, Akowonjo Junction, Dopemu, Lagos",
    openingHours: "Monday-Saturday: 6:00am - 9:00pm, Sunday: 7:00am - 3:00pm",
  },
  "By Dobbil Avenue, Along Phone Village Road, Alaba International Market": {
    fullAddress:
      "CS1 Ground Floor, Corner Stone Plaza, By Dobbil Avenue, Along Phone Village Road, Electronics Section, Alaba International Market",
    openingHours: "Monday-Saturday: 8:00am - 5:00pm, Sunday: Closed",
  },
  "Opposite Diamond Estate, By Festac Link Bridge, Amuwo Odofin": {
    fullAddress:
      "Shop A105, Cosjane Mall, Opposite Diamond Estate, By Festac Link Bridge, Amuwo Odofin, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "By Ogunfayo Bus Stop, KM 36, Lekki-Epe Expressway, Eputu, Awoyaya": {
    fullAddress:
      "Titi's Place, Beside Royal Park Hotel, By Ogunfayo Bus Stop, KM 36, Lekki-Epe Expressway, Eputu, Awoyaya, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "158 Broad Street, Lagos Island (Behind UBA Head Office, Marina)": {
    fullAddress:
      "158 Broad Street, Lagos Island (Behind UBA Head Office, Marina), Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "103 Okota Road, Cele": {
    fullAddress: "103 Okota Road, Cele",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 6:00am - 3:00pm",
  },
  "Beside Petrocam Filling Station, Near Epe T-Junction, Epe": {
    fullAddress:
      "Animashaun Plaza, Beside Petrocam Filling Station, Near Epe T-Junction, Epe",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "69 Ikorodu Road, Fadeyi": {
    fullAddress: "69 Ikorodu Road, Fadeyi, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Festac First Gate, Beside INEC Office, Festac Town": {
    fullAddress:
      "1st Avenue Road, Festac First Gate, Beside INEC Office, Festac Town, Lagos",
    openingHours: "Monday-Saturday: 6:00am - 8:00pm, Sunday: 6:00am - 3:00pm",
  },
  "7 Hospital Road, Ifako, Gbagada": {
    fullAddress: "7 Hospital Road, Ifako, Gbagada, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Gbagada Expressway, Beside Eterna Filling Station, Gbagada": {
    fullAddress:
      "GIG Logistics Digital Hub, No. 1 Sunday Ogunyade Street, Gbagada Expressway, Beside Eterna Filling Station, Gbagada, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "KM 17, Scapular Plaza, Igbo Efon": {
    fullAddress: "KM 17, Scapular Plaza, Igbo Efon",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "9 Medical Road, Former Simbiat Abiola Way, Opposite Zenith Bank": {
    fullAddress:
      "9 Medical Road, Former Simbiat Abiola Way, Opposite Zenith Bank",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "80 Awolowo Way, Ikeja": {
    fullAddress: "80 Awolowo Way, Ikeja, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "103 Awolowo Road, Ikoyi": {
    fullAddress: "103 Awolowo Road, Ikoyi, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "16 Ikosi Road, Ketu": {
    fullAddress: "16 Ikosi Road, Ketu, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Sabo Road Garage, Ikorodu": {
    fullAddress: "Sabo Road Garage, Ikorodu",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "29 Idimu Road, Opposite Local Government Council, Ikotun": {
    fullAddress:
      "29 Idimu Road, Opposite Local Government Council, Ikotun, Lagos",
    openingHours: "Monday-Saturday: 6:00am - 7:00pm, Sunday: 6:00am - 3:00pm",
  },
  "12 Industrial Avenue, Cappa Bus Stop, Ilupeju": {
    fullAddress:
      "Flat 1, Block 1, LSDPC Estate, Beside UBA, 12 Industrial Avenue, Cappa Bus Stop, Ilupeju, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Lagos International Trade Fair Complex": {
    fullAddress:
      "Shop D77 & D78, Abia Plaza, BBA, Lagos International Trade Fair Complex, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 5:00pm, Sunday: Closed",
  },
  "164 Lagos-Abeokuta Expressway, Beside Access Bank, Iyana Ipaja": {
    fullAddress:
      "164 Lagos-Abeokuta Expressway, Beside Access Bank, Iyana Ipaja, Lagos",
    openingHours: "Monday-Saturday: 24hours, Sunday: 24hours",
  },
  "43 Osolo Way, Ajao Estate, Ekwu Awolo House": {
    fullAddress: "43 Osolo Way, Ajao Estate, Ekwu Awolo House",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "GIGM Terminal, 20 Ikorodu Express Road, Jibowu": {
    fullAddress: "GIGM Terminal, 20 Ikorodu Express Road, Jibowu, Lagos",
    openingHours: "Monday-Saturday: 24hours, Sunday: 24hours",
  },
  "No. 1A, Wole Ariyo Street, Beside First Bank, Lekki Phase 1": {
    fullAddress: "No. 1A, Wole Ariyo Street, Beside First Bank, Lekki Phase 1",
    openingHours: "Monday-Saturday: 7:00am - 9:00pm, Sunday: 7:00am - 3:00pm",
  },
  "Jubilee Mall, Admiralty Way, Lekki Phase 1, Lekki": {
    fullAddress: "Jubilee Mall, Admiralty Way, Lekki Phase 1, Lekki",
    openingHours: "Monday-Saturday: 7:30am - 9:00pm, Sunday: 7:00am - 3:00pm",
  },
  "2 Admiralty Road, Lekki Phase 1": {
    fullAddress: "2 Admiralty Road, Lekki Phase 1",
    openingHours: "Monday-Saturday: 7:30am - 9:00pm, Sunday: Closed",
  },
  "Ground floor, Legends Place Mall, Plot 29 Fola Osibo, Lekki Phase 1": {
    fullAddress:
      "Ground floor, Legends Place Mall, Plot 29 Fola Osibo, Lekki Phase 1, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "3 Ijaiye Road, Beside FCMB, Ogba": {
    fullAddress: "3 Ijaiye Road, Beside FCMB, Ogba",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "141 Ogudu Road, Beside UBA, Studio24 Building, Ogudu": {
    fullAddress: "141 Ogudu Road, Beside UBA, Studio24 Building, Ogudu",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Opposite Divas Cake, Beside Access Bank, Ojodu Berger Bus Stop": {
    fullAddress:
      "47A Ogunnusi Road, Opposite Divas Cake, Beside Access Bank, Ojodu Berger Bus Stop, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Old Ojo Road, After Agboju Bus Stop, Opposite Access Bank": {
    fullAddress:
      "Old Ojo Road, After Agboju Bus Stop, Opposite Access Bank, By the Police Station",
    openingHours: "Monday-Saturday: 6:30am - 7:00pm, Sunday: 6:30am - 3:00pm",
  },
  "Banex Mall, Suite V.GL 01, Akiogun Road, Oniru": {
    fullAddress: "Banex Mall, Suite V.GL 01, Akiogun Road, Oniru, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 8:00pm, Sunday: Closed",
  },
  "62B Opebi Road, Opposite So-Fresh, Opebi, Ikeja": {
    fullAddress:
      "62B Opebi Road, By Salvation Junction, Opposite So-Fresh, Opebi, Ikeja, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Orchid Road (E-MALL Plaza), By Van Daniel's Estate, Orchid": {
    fullAddress:
      "Orchid Road (E-MALL Plaza), By Van Daniel's Estate, Orchid, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "2 Ganiu Eletu Way, Osapa London, Lekki-Epe Expressway": {
    fullAddress: "2 Ganiu Eletu Way, Osapa London, Lekki-Epe Expressway, Lagos",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "25 Otto Causeway, Opposite Iddo Bus Stop, Iddo Ebute Metta": {
    fullAddress:
      "25 Otto Causeway, Opposite Iddo Bus Stop, Iddo Ebute Metta, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "26 Adeniran Ogunsanya, Surulere": {
    fullAddress: "26 Adeniran Ogunsanya, Surulere, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "169 Badagry Expressway, Volkswagen Bus Stop": {
    fullAddress: "169 Badagry Expressway, Volkswagen Bus Stop",
    openingHours: "Monday-Saturday: 6:30am - 6:00pm, Sunday: 6:30am - 3:00pm",
  },
  "1436 Sanusi Fafunwa Street, Victoria Island": {
    fullAddress: "1436 Sanusi Fafunwa Street, Victoria Island, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "272b Akin Adeshola Street, Beside Honda Place, Victoria Island": {
    fullAddress:
      "272b Akin Adeshola Street, Beside Honda Place, Victoria Island, Lagos",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Tejuosho Ultra Modern Shopping Complex, Ojuelegba Road, Yaba": {
    fullAddress:
      "Shop G-021, Ground Floor, Tejuosho Ultra Modern Shopping Complex, Ojuelegba Road, Yaba",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Nasarawa
  "Police Officers' Mess, Opposite Polaris Bank, Jos Road, Lafia": {
    fullAddress:
      "Shops 1 & 2, Police Officers' Mess, Opposite Polaris Bank, Jos Road, Lafia",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Niger
  "Beside NEPA Office, Farm Center Area, Tunga, Minna": {
    fullAddress:
      "Landmark: After Mr Biggs, Beside NEPA Office, Farm Center Area, Tunga, Minna, Niger State",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Ogun
  "62 Tinubu Street, Ita Eko, Abeokuta": {
    fullAddress: "62 Tinubu Street, Ita Eko, Abeokuta, Ogun State",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "SSANU Complex, Beside Paradise, FUNAAB, Abeokuta": {
    fullAddress:
      "Block A, Shop 9, SSANU Complex, Beside Paradise, FUNAAB, Abeokuta",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "102 Ibadan Road, Opposite NEPA Office, Ibadan Garage, Ijebu Ode": {
    fullAddress:
      "102 Ibadan Road, Opposite NEPA Office, Ibadan Garage, Ijebu Ode",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "3 Abeokuta-Lagos Expressway, Opposite Sango Bridge, Sango Ota": {
    fullAddress:
      "3 Abeokuta-Lagos Expressway, Beside 9mobile Office, Opposite Sango Bridge, Sango Ota",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Ondo
  "22 Oyemekun Road, Opposite SLOT, Akure": {
    fullAddress: "22 Oyemekun Road, Opposite SLOT, Akure, Ondo State",
    openingHours: "Monday-Saturday: 7:30am - 6:30pm, Sunday: Closed",
  },
  "30 Yaba Street, Opposite Crunchies, Ondo Town": {
    fullAddress: "30 Yaba Street, Opposite Crunchies, Ondo Town, Ondo State",
    openingHours: "Monday-Saturday: 7:30am - 6:30pm, Sunday: closed",
  },

  // Osun
  "EXODUS Filling Station, Mayfair, Ile-lfe, Osun State": {
    fullAddress:
      "EXODUS Filling Station, Opposite Airtel Office, Mayfair, Ile-lfe, Osun State",
    openingHours: "Monday-Saturday: 7:30am - 6:30pm, Sunday: Closed",
  },
  "Gbongan-Ibadan Road, NIPCO Filling Station, Ogo Oluwa, Osogbo": {
    fullAddress:
      "KM 3, Gbongan-Ibadan Road, NIPCO Filling Station, Ogo Oluwa, Osogbo",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },

  // Oyo
  "Town Planning Complex, By Sumal Foods, Ring Road, Ibadan": {
    fullAddress: "Town Planning Complex, By Sumal Foods, Ring Road, Ibadan",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Opposite Funcktionals Clothing, Bodija-UI Road, UI, Ibadan": {
    fullAddress:
      "Suite 5, Kamal Memorial Plaze, Former Iyalode Complex, Opposite Funcktionals Clothing, Bodija-UI Road, UI, Ibadan",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },
  "Adjacent Olowo Tin Fowo Shanu Shopping Complex, Iwo Road, Ibadan": {
    fullAddress:
      "Bovas Filling Station, 106/107 Agbaakin Layout, Adjacent Olowo Tin Fowo Shanu Shopping Complex, Iwo Road, Ibadan",
    openingHours: "Monday-Saturday: 7:30am - 7:00pm, Sunday: Closed",
  },
  "Eterna Filling Station (Akala Complex), Starlight, Ogbomoso": {
    fullAddress:
      "Eterna Filling Station (Akala Complex), Opposite Zenith Bank, Starlight, Ogbomoso",
    openingHours: "Monday-Saturday: 7:30am - 6:30pm, Sunday: Closed",
  },

  // Plateau
  "Plaza 1080, Yakubu Gowon Way, Dadin Kowa Second Gate": {
    fullAddress: "Plaza 1080, Yakubu Gowon Way, Dadin Kowa Second Gate",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: Closed",
  },
  "Opposite Jankwano, Bingham University Teaching Hospital, Jos": {
    fullAddress: "Opposite Jankwano, Bingham University Teaching Hospital, Jos",
    openingHours: "Monday-Saturday: 8:00am - 7:00pm, Sunday: 8:00am - 2:00pm",
  },

  // Rivers
  "18 Ada George, By Okilton Junction, Port Harcourt": {
    fullAddress: "18 Ada George, By Okilton Junction, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Linus Book Shop Building, Beside Today FM Road, East-West Road, PHC": {
    fullAddress:
      "Linus Book Shop Building, Beside Today FM Road, East-West Road, PHC",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Cocaine Village Junction, Off Aba Road, Rumuogba, Port Harcourt": {
    fullAddress:
      "Cocaine Village Junction, Off Aba Road, Opposite Genesis, Rumuogba, Port Harcourt",
    openingHours: "Monday-Saturday: 6:00am - 6:00pm, Sunday: 8:00am - 3:00pm",
  },
  "299 Old Refinery Road, By De-Young Junction, Elelenwo, Port Harcourt": {
    fullAddress:
      "299 Old Refinery Road, By De-Young Junction, Elelenwo, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Emmanuel Plaza, G.U. Ake Road, Eliogbolo, Eliozu, Port Harcourt": {
    fullAddress:
      "Emmanuel Plaza, G.U. Ake Road, Beside Planet Filling Station, Eliogbolo, Eliozu, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "61 Olu Obasanjo Road, Opposite Olu Obasanjo Roundabout, Port Harcourt": {
    fullAddress:
      "61 Olu Obasanjo Road, Opposite Olu Obasanjo Roundabout, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "89 Peter Odili Road, Besides Eterna Filling Station, Port Harcourt": {
    fullAddress:
      "89 Peter Odili Road, Besides Eterna Filling Station, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: CLosed",
  },
  "Big Treat Rukpokwu, KM 16 Airport Road, Port Harcourt": {
    fullAddress: "Big Treat Rukpokwu, KM 16 Airport Road, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "9 Stadium Road, Beside Benjack, Port Harcourt": {
    fullAddress: "9 Stadium Road, Beside Benjack, Port Harcourt",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: 8:00am -3:00pm",
  },
  "67 Tombia Ext, GRA, Port Harcourt": {
    fullAddress: "67 Tombia Ext, GRA, Port Harcourt",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
  "Agora Plaza, 118 Woji Road, By Bodo Junction, GRA Phase 2, Port Harcourt": {
    fullAddress:
      "Agora Plaza, 118 Woji Road, By Bodo Junction, GRA Phase 2, Port Harcourt (Same Building with Miskay Boutique)",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Sokoto
  "3/4 Maiduguri Road, Gawon Nama Area": {
    fullAddress: "3/4 Maiduguri Road, Gawon Nama Area",
    openingHours: "Monday-Saturday: 7:00am - 6:00pm, Sunday: Closed",
  },

  // Taraba
  "106 White Castle Plaza, Barde Way, Jalingo": {
    fullAddress:
      "106 White Castle Plaza, Barde Way, Beside A.U.K. Kirbir Shopping Plaza, Jalingo",
    openingHours: "Monday-Saturday: 7:30am - 6:00pm, Sunday: Closed",
  },

  // Yobe
  "Shop 2, Adhaza Plaza, Gashuwa Road, Damaturu": {
    fullAddress: "Shop 2, Adhaza Plaza, Gashuwa Road, Damaturu",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },

  // Zamfara
  "C1, A.A. Master Plaza, Canteen Road, Gusau": {
    fullAddress: "C1, A.A. Master Plaza, Canteen Road, Gusau",
    openingHours: "Monday-Saturday: 8:00am - 6:00pm, Sunday: Closed",
  },
};

/**
 * Get full terminal details by shorter address key
 * @param {string} shortAddress - The shorter address used as key
 * @returns {Object|null} - Full terminal details or null if not found
 */
function getTerminalInfo(shortAddress: keyof typeof terminalMapping) {
  const terminal = terminalMapping[shortAddress];

  if (!terminal) {
    return null;
  }

  return {
    fullAddress: terminal.fullAddress,
    openingHours: terminal.openingHours,
  };
}
