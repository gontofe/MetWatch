var xhrRequest = function (url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.send();
};

function translateMoonPhase(mPhase) {
  if (mPhase === 0) {
    return 0; // new moon
  } else if (mPhase < 0.25) {
    return 1; // waxing crescent
  } else if (mPhase == 0.25) {
    return 2; // first quarter 
  } else if (mPhase < 0.5) {
    return 3; // waxing gibbous
  } else if (mPhase == 0.5) {
    return 4; // full moon
  } else if (mPhase < 0.75) {
    return 5; // waning gibbous
  } else if (mPhase == 0.75) {
    return 6; // last quarter
  } else if (mPhase < 1) {
    return 7; // waning crescent
  } else {
    return 0;
  }
}

function translateConditions(cond) {
  // Need to interpret conditions from here:
  // http://www.metoffice.gov.uk/media/pdf/3/0/DataPoint_API_reference.pdf
  // NA Not available
  switch(cond) {
    case "0": 
      return 0; // Clear Night
    case "1":
      return 1; // Sun 
    case "2":
    case "3": 
      return 2; // Partly Cloudy
    case "5": 
    case "6":
      return 3; // Fog
    case "7":
    case "8":
      return 4; // Overcast
    case "9":
    case "10":
    case "11":
    case "12": 
      return 5; // Light Rain
    case "13":
    case "14":
    case "15":
      return 6; // Heavy Rain
    case "16":
    case "17":
    case "18":
      return 7; // Sleet
    case "19":
    case "20":
    case "21":
      return 8; // Hail
    case "22":
    case "23":
    case "24":
      return 9; // Light snow
    case "25":
    case "26":
    case "27":
      return 10; // Heavy snow
    case "28":
    case "29":
    case "30":
      return 11; // Thunder
    default:
      return 12; // NA
  } 
}

function convertDate(newDate) {
  var hours = newDate.getHours();
  switch (hours) {
    case 01:
    case 02:
      newDate.setHours(00);
      break;
    case 04:
    case 05:
      newDate.setHours(03);
      break;
    case 07:
    case 08:
      newDate.setHours(06);
      break;  
    case 10:
    case 11:
      newDate.setHours(09);
      break; 
    case 13:
    case 14:
      newDate.setHours(12);
      break; 
    case 16:
    case 17:
      newDate.setHours(15);
      break; 
    case 19:
    case 20:
      newDate.setHours(18);
      break; 
    case 22:
    case 23:
      newDate.setHours(21);
      break; 
    default: 
      console.log("I'm default!");
      break;
  } 
}

function locationSuccess(pos) {
  var API_KEY = "fa6afc39-2e1c-4d39-97c6-17f32e6820b5";
  var cond;
  var conditions;
  var date = new Date();
  var sunriseTime = "00:00";
  var sunsetTime = "00:00";
  var moonData;
  var mPhase = "0.2";
  var moonPhase = 0;
    
  // Set stuff from SunCalc functions
  var times = SunCalc.getTimes(new Date(), 51.5, -0.1);
  sunriseTime = times.sunrise.getHours() + ':' + times.sunrise.getMinutes();
  sunsetTime = times.sunset.getHours() + ':' + times.sunset.getMinutes();
  moonData = SunCalc.getMoonIllumination(date);
  console.log(moonData);
  function roundToNearest( number, multiple ){
    var half = multiple/2;
    return number+half - (number+half) % multiple;
  }
  mPhase = roundToNearest(moonData.phase,0.1);
  moonPhase = translateMoonPhase(mPhase);
  
  // Calculate date for Met Office API call and adjust for timezone
  var offset = (date.getTimezoneOffset());
  convertDate(date);
  var newDate = new Date (date.getTime() - (offset * 60000) );
  var isoDate = newDate.toISOString();

  //var siteId = "352241";
  
  // Construct URL with API key
  var url = "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/nearestlatlon?res=3hourly" +
  "&lat=" + pos.coords.latitude + "&lon=" + pos.coords.longitude + "&time=" + isoDate + "&key=" + API_KEY;
  console.log("URL is " + url);
  xhrRequest(url, 'GET',
    function(responseText) {
      // responseText contains a JSON object with weather info
      var json = JSON.parse(responseText);
      
      var temperature = json.SiteRep.DV.Location.Period.Rep.T;
      cond = json.SiteRep.DV.Location.Period.Rep.W;
      
      conditions = translateConditions(cond);
      
      // Assemble dictionary using our keys
      var dictionary = {
        "KEY_TEMPERATURE": temperature,
        "KEY_CONDITIONS": conditions,
        "KEY_SUNRISE": sunriseTime,
        "KEY_SUNSET": sunsetTime,
        "KEY_MOONPHASE": moonPhase
      };
      
      // Send to Pebble
      Pebble.sendAppMessage(dictionary,
        function(e) {
          console.log("Weather info sent to Pebble successfully!");
        },
        function(e) {
          console.log("Error sending weather info to Pebble!");
        }
      );
    }
  );
}

function locationError(err) {
  console.log("Error requesting location!");
}

function getWeather() {
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    {timeout: 15000, maximumAge: 60000}
  );
}

// Listen for when the watchfase is opened
Pebble.addEventListener('ready',
  function(e) {
    console.log("PebbleKit JS ready!");
    
    // Get the initial weather
    getWeather();
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log("AppMessage received!");
    getWeather();
  }
);

//
// SunCalc stuff follows
//
// Pilfered from https://github.com/mourner/suncalc
//


var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180;

// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


// date/time constants and conversions

var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
function toDays(date)   { return toJulian(date) - J2000; }


// general calculations for position

var e = rad * 23.4397; // obliquity of the Earth

function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }


// general sun calculations

function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

function eclipticLongitude(M) {

    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
        P = rad * 102.9372; // perihelion of the Earth

    return M + C + P + PI;
}

function sunCoords(d) {

    var M = solarMeanAnomaly(d),
        L = eclipticLongitude(M);

    return {
        dec: declination(L, 0),
        ra: rightAscension(L, 0)
    };
}


var SunCalc = {};


// calculates sun position for a given date and latitude/longitude

SunCalc.getPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c  = sunCoords(d),
        H  = siderealTime(d, lw) - c.ra;

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: altitude(H, phi, c.dec)
    };
};


// sun times configuration (angle, morning name, evening name)

var times = SunCalc.times = [
    [-0.833, 'sunrise',       'sunset'      ],
    [  -0.3, 'sunriseEnd',    'sunsetStart' ],
    [    -6, 'dawn',          'dusk'        ],
    [   -12, 'nauticalDawn',  'nauticalDusk'],
    [   -18, 'nightEnd',      'night'       ],
    [     6, 'goldenHourEnd', 'goldenHour'  ]
];

// adds a custom time to the times config

SunCalc.addTime = function (angle, riseName, setName) {
    times.push([angle, riseName, setName]);
};


// calculations for sun times

var J0 = 0.0009;

function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }

// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {

    var w = hourAngle(h, phi, dec),
        a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
}


// calculates sun times for a given date and latitude/longitude

SunCalc.getTimes = function (date, lat, lng) {

    var lw = rad * -lng,
        phi = rad * lat,

        d = toDays(date),
        n = julianCycle(d, lw),
        ds = approxTransit(0, lw, n),

        M = solarMeanAnomaly(ds),
        L = eclipticLongitude(M),
        dec = declination(L, 0),

        Jnoon = solarTransitJ(ds, M, L),

        i, len, time, Jset, Jrise;


    var result = {
        solarNoon: fromJulian(Jnoon),
        nadir: fromJulian(Jnoon - 0.5)
    };

    for (i = 0, len = times.length; i < len; i += 1) {
        time = times[i];

        Jset = getSetJ(time[0] * rad, lw, phi, dec, n, M, L);
        Jrise = Jnoon - (Jset - Jnoon);

        result[time[1]] = fromJulian(Jrise);
        result[time[2]] = fromJulian(Jset);
    }

    return result;
};


// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

function moonCoords(d) { // geocentric ecliptic coordinates of the moon

    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * d), // mean anomaly
        F = rad * (93.272 + 13.229350 * d),  // mean distance

        l  = L + rad * 6.289 * sin(M), // longitude
        b  = rad * 5.128 * sin(F),     // latitude
        dt = 385001 - 20905 * cos(M);  // distance to the moon in km

    return {
        ra: rightAscension(l, b),
        dec: declination(l, b),
        dist: dt
    };
}

SunCalc.getMoonPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c = moonCoords(d),
        H = siderealTime(d, lw) - c.ra,
        h = altitude(H, phi, c.dec);

    // altitude correction for refraction
    h = h + rad * 0.017 / tan(h + rad * 10.26 / (h + rad * 5.10));

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: h,
        distance: c.dist
    };
};


// calculations for illumination parameters of the moon,
// based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
// Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

SunCalc.getMoonIllumination = function (date) {

    var d = toDays(date),
        s = sunCoords(d),
        m = moonCoords(d),

        sdist = 149598000, // distance from Earth to Sun in km

        phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
        inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
        angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
                cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

    return {
        fraction: (1 + cos(inc)) / 2,
        phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
        angle: angle
    };
};
