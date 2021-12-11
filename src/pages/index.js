import React, { useRef, useEffect, useState } from "react";
import L from "leaflet";
import { Marker, useMap } from "react-leaflet";
import Map from "components/Map";
import Header from "components/Header";
import BasicTable from "components/BasicTable";
import axios from "axios";
import "assets/stylesheets/application.scss";
import BarChart from "../components/BarChart";
import PieChart from "../components/PieChart";
import HorizontalBarChart from "../components/HorizontalBarChart";
import { FaGlobe } from "react-icons/fa";
import { FaFlag } from "react-icons/fa";

const LOCATION = {
  lat: 0,
  lng: 0,
};
const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;

/**
 * MapEffect
 * @description This is an example of creating an effect used to zoom in and set a popup on load
 */
const MapEffect = ({ markerRef }) => {
  console.log("map");
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current || !map) return;
    let getCountries;
    let getProvinces;

    (async function run() {
      try {
        getCountries = await axios.get(
          "https://corona.lmao.ninja/v2/countries"
        );
        // API call to get fetch data for provinces in a country
        getProvinces = await axios.get(
          "https://disease.sh/v3/covid-19/jhucsse"
        );
      } catch (e) {
        console.log(`failed to fetch countries: ${e.message}`);
        return;
      }

      // console.log(getProvinces);
      const countries = getCountries?.data;
      let provinces = getProvinces?.data;
      provinces = provinces.filter((elem) => elem.province);

      const hasData =
        Array.isArray(countries) &&
        Array.isArray(provinces) &&
        countries.length > 0 &&
        provinces.length > 0;

      if (!hasData) return;

      const geoJsonCountries = {
        type: "FeatureCollection",
        features: countries.map((country = {}) => {
          const { countryInfo = {} } = country;
          const { lat, long: lng } = countryInfo;
          return {
            type: "Feature",
            properties: {
              ...country,
            },
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          };
        }),
      };

      const geoJsonProvinces = {
        type: "FeatureCollection",
        features: provinces.map((elem) => {
          const { coordinates = {} } = elem;
          const { latitude: lat, longitude: lng } = coordinates;
          return {
            type: "Feature",
            properties: {
              ...elem,
            },
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          };
        }),
      };

      const geoJsonCountryLayer = new L.GeoJSON(geoJsonCountries, {
        pointToLayer: (feature = {}, latlng) => {
          const { properties = {} } = feature;
          let updatedFormatted;
          let casesString;

          const { country, updated, cases, deaths, recovered } = properties;

          casesString = `${cases}`;

          if (cases > 1000) {
            casesString = `${casesString.slice(0, -3)}k+`;
          }

          if (updated) {
            updatedFormatted = new Date(updated).toLocaleString();
          }

          const html = `
            <span class="icon-marker">
              <span class="icon-marker-tooltip">
                <h2>${country}</h2>
                <ul>
                  <li><strong>Confirmed: </strong>${cases.toLocaleString()}</li>
                  <li><strong>Deaths: </strong>${deaths.toLocaleString()}</li>
                  <li><strong>Recovered: </strong>${recovered.toLocaleString()}</li>
                  <li><strong>Update: </strong>${updatedFormatted.toLocaleString()}</li>
                </ul>
              </span>
              ${casesString}
            </span>
          `;

          return L.marker(latlng, {
            icon: L.divIcon({
              className: "icon",
              html,
            }),
            riseOnHover: true,
          });
        },
      });

      const geoJsonProvincesLayer = new L.GeoJSON(geoJsonProvinces, {
        pointToLayer: (feature = {}, latlng) => {
          const { properties = {} } = feature;
          const { province = "", stats = {}, updatedAt } = properties;
          let updatedFormatted;
          let casesString;
          let pStats = null;

          casesString = `${stats?.confirmed}`;

          if (stats?.confirmed > 1000) {
            casesString = `${casesString.slice(0, -3)}k+`;
          }

          if (updatedAt) {
            updatedFormatted = new Date(updatedAt).toLocaleString();
          }

          const html = `
            <span class="small-icon-marker">
              <span class="icon-marker-tooltip">
                <h2>${province}</h2>
                <ul>
                  <li><strong>Confirmed: </strong>${(stats?.confirmed).toLocaleString()}</li>
                  <li><strong>Deaths: </strong>${(stats?.deaths).toLocaleString()}</li>
                  <li><strong>Update: </strong>${(updatedFormatted).toLocaleString()}</li>
                </ul>
              </span>
              ${casesString}
            </span>
          `;
          return L.marker(latlng, {
            icon: L.divIcon({
              className: "icon",
              html,
            }),
            riseOnHover: true,
          });
        },
      });

      geoJsonCountryLayer.addTo(map);
      geoJsonProvincesLayer.addTo(map);
    })();
  }, [map, markerRef]);

  return null;
};

const IndexPage = () => {
  const markerRef = useRef();
  const [totalToggle, setTotalToggle] = useState(false);
  const [geoJsonCountries, setGeoJsonCountries] = useState([]);
  // const [ geoJsonProvinces, setGeoJsonProvinces ] = useState([]);

  const mapSettings = {
    center: CENTER,
    defaultBaseMap: "OpenStreetMap",
    zoom: DEFAULT_ZOOM,
  };

  useEffect(() => {
    // create event handler to listen for toggle clicked - setTotalToggled to true
    let getCountries;
    // let getProvinces;
    const fetchCountries = async () => {
      try {
        getCountries = await axios.get(
          "https://corona.lmao.ninja/v2/countries"
        );
        // API call to get fetch data for provinces in a country
        // getProvinces = await axios.get("https://disease.sh/v3/covid-19/jhucsse");
        const countries = getCountries?.data;
        // let provinces = getProvinces?.data;

        // provinces = provinces.filter(elem => elem.province);
        // const hasData = Array.isArray(countries) && Array.isArray(provinces) && countries.length > 0 && provinces.length > 0;
        const hasData = Array.isArray(countries) && countries.length > 0;

        if (!hasData) return;

        setGeoJsonCountries(countries);
      } catch (e) {
        console.log(`failed to fetch countries: ${e.message}`);
        return;
      }
    };
    fetchCountries();
  }, []);

  let confirmedData;
  let activeData;
  let recoveredData;
  let deathsData;
  if (geoJsonCountries && geoJsonCountries.length > 0) {
    confirmedData = geoJsonCountries.map((elem) => {
      return {
        country: elem.country,
        value: elem.cases,
      };
    });

    activeData = geoJsonCountries.map((elem) => {
      return {
        country: elem.country,
        value: elem.active,
      };
    });

    recoveredData = geoJsonCountries.map((elem) => {
      return {
        country: elem.country,
        value: elem.recovered,
      };
    });

    deathsData = geoJsonCountries.map((elem) => {
      return {
        country: elem.country,
        value: elem.deaths,
      };
    });
  }

  return (
    <div className="mainPageContainer">
      <div className="headerFix">
        <Header />
      </div>
      <div className="mainPageModules">
        <div className="tableModule">
          <h2>Confirmed</h2>
          <BasicTable data={confirmedData} showTotal={totalToggle} />
        </div>

        <div className="tableModule">
          <h2>Active</h2>
          <BasicTable data={activeData} showTotal={totalToggle} />
        </div>

        <div className="testMapContainer">
          <input
            type="checkbox"
            name="checkbox"
            id="checkbox"
            className="checkbox"
          />
          <label
            for="checkbox"
            className="statsButton"
            onClick={() => setTotalToggle(!totalToggle)}
          >
            <FaGlobe /> <FaFlag />
            <div className="ball"></div>
          </label>
          <Map {...mapSettings}>
            <MapEffect markerRef={markerRef} />
            <Marker ref={markerRef} position={CENTER} />
          </Map>
        </div>

        <div className="tableModule">
          <h2>Recovered</h2>
          <BasicTable data={recoveredData} showTotal={totalToggle} />
        </div>

        <div className="tableModule">
          <h2>Deaths</h2>
          <BasicTable data={deathsData} showTotal={totalToggle} />
        </div>
        <div className="graphContainer">
          <div className="graphModule">
            <BarChart
              confirmed={confirmedData}
              active={activeData}
              recovered={recoveredData}
              deaths={deathsData}
            />
          </div>
          <div className="graphModule">
            <PieChart confirmed={confirmedData} />
          </div>
          <div className="graphModule">
            <HorizontalBarChart countries={geoJsonCountries} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
