//File: example/example-node.ts

import { z } from "zod";
import axios from "axios";

import { defineDAINService, ServicePinnable, ToolConfig } from "@dainprotocol/service-sdk";

import {
  DainResponse,
  AlertUIBuilder,
  CardUIBuilder,
  TableUIBuilder,
  MapUIBuilder,
  LayoutUIBuilder,
  ChartUIBuilder,
  FormUIBuilder
} from "@dainprotocol/utils";
import { toEditorSettings } from "typescript";

const port = Number(process.env.PORT) || 2022;
const apiKey = '6ca0b6efffe246cda90e204dc02085e6';

interface PlaceProperties {
  name: string;
  categories: string[];
  formatted: string;
}
interface GeoapifyResponse {
  features: Array<{
    properties: PlaceProperties;
    geometry: {
      type: string;
      coordinates: [number, number];  // [longitude, latitude]
    };
  }>;
}
const getFunRec: ToolConfig = {
  id: "get-FunRec",
  name: "Get FunRec",
  description: "Fetches fun activities around the area",
  input: z
    .object({
      locationName: z.string().describe("Location name"),
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
    })
    .describe("Input parameters for the Fun Activities"),
  output: z
    .object({
      places: z.array(
        z.object({
        name: z.string(),
        category: z.string(),
        address: z.string(),
        })
    ),
  })
    .describe("List of places with fun Activities"),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async ( { locationName, latitude, longitude }, agentInfo,context) => 
  {
    console.log(
      `User / Agent ${agentInfo.id} requested activities at ${locationName} (${latitude},${longitude})`
    );

    const response = await axios.get<GeoapifyResponse>(
      `https://api.geoapify.com/v2/places?lat=${latitude}&lon=${longitude}&categories=tourism,leisure&limit=10&apiKey=${apiKey}`
    );

    const places = response.data.features;
    //console.log("test")
    
    //console.log(places)
    const placeList = places.map((place, index) => {
      let name = place.properties.name
      const longtitude = place.geometry.coordinates[0];
      const latitude = place.geometry.coordinates[1];
      if (name === undefined) {
        name = "unknown"
      }

      return {
        name: name,
        category: place.properties.categories.join(", "),
        address: place.properties.formatted,
        latitude: latitude,
        longitude: longitude,
      };
    });
    return {
      text: `Heres a list of FUN activities in ${locationName}:\n${placeList}`,
        
      data: {
        places: placeList
       },
       ui: new CardUIBuilder()
       .setRenderMode("page")
       .title(`Fun Activities in ${locationName}`)
       .addChild(
         new MapUIBuilder()
           .setInitialView(latitude, longitude, 10)
           .setMapStyle("mapbox://styles/mapbox/streets-v12")
           .addMarkers(
            placeList.map((place) => ({
               latitude: place.latitude,
               longitude: place.longitude,
               title: place.name,
               description: `Explore ${place.name}`,
               text: `${place.name}`,
             }))
           )
           .build()
       )
       .content(`Discover exciting activities in ${locationName} today!`)
       .build(),
    };
  },
};

const createSearchResponse = (results: any) => {
  const alertUI = new AlertUIBuilder()
    .variant("info")
    .title("Search Complete")
    .message("Found 3 matching results")
    .build();

  const tableUI = new TableUIBuilder()
    .addColumns([
      {
        key: "name", header: "Name",
        type: ""
      },
      {
        key: "value", header: "Value",
        type: ""
      }
    ])
    .rows(results)
    .build();

  const cardUI = new CardUIBuilder()
    .title("Search Results")
    .addChild(alertUI)
    .addChild(tableUI)
    .build();

  return new DainResponse({
    text: "Search complete",
    data: results,
    ui: cardUI
  });
};

const dainService = defineDAINService({
  metadata: {
    title: "FunRec DAIN Service",
    description:
      "A DAIN service for recommending Activities API",
    version: "1.0.0",
    author: "Mark and Renzo",
    tags: ["Activities", "fun", "dain"],
    logo: "https://img.icons8.com/?size=100&id=2qSx1JG5SSGn&format=png&color=000000",
  },
  exampleQueries: [
    {
      category: "Activities",
      queries: [
        "What fun activities around Carson?",
        "What fun activities around Cerritos?",
        "What fun activities around LongBeach?",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [getFunRec],
});

dainService.startNode({ port: port }).then(({ address }) => {
  console.log("FunRec DAIN Service is running at :" + address().port);
});

const getFunRecWidget: ServicePinnable = {
  id: "funRec",
  name: "Recreation Activities",
  description: "Shows available recreational activities",
  type: "widget",
  label: "Recreation",
  icon: "map",

  getWidget: async () => {
    try {
      // Fetch recreation data
      const recResults = await fetchRecreationData();

      // Recreation Table UI
      const recTableUI = new TableUIBuilder()
        .addColumns([
          {
            key: "name", header: "Activity",
            type: ""
          },
          {
            key: "location", header: "Location",
            type: ""
          },
          {
            key: "cost", header: "Cost ($)",
            type: ""
          }
        ])
        .rows(recResults);

      // Compose UI Layout
      const cardUI = new CardUIBuilder()
        .title("Recreation Activities")
        .addChild(new AlertUIBuilder().variant("info").message("Explore fun activities near you!").build())
        .addChild(recTableUI.build());

      return new DainResponse({
        text: "Recreation data loaded",
        data: recResults,
        ui: cardUI.build()
      });

    } catch (error) {
      return new DainResponse({
        text: "Failed to load recreation data",
        data: null,
        ui: new AlertUIBuilder()
          .variant("error")
          .message("Unable to load activities. Please try again later.")
          .build()
      });
    }
  }
};

async function fetchRecreationData(): Promise<Record<string, unknown>[]> {
  // Mock data for demonstration purposes
  return [
    { name: "Hiking", location: "Mountain Trail", cost: 0 },
    { name: "Museum Visit", location: "City Museum", cost: 15 },
    { name: "Concert", location: "Downtown Arena", cost: 50 },
  ];
}
