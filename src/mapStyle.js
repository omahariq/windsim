export const style={version:8,sources:{osm:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'},dem:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium',maxzoom:15,attribution:'Terrain © Mapzen'}},light:{anchor:'viewport',color:'#ffffff',intensity:.55,position:[1.5,180,40]},layers:[
{id:'background',type:'background',paint:{'background-color':'#101416'}},
{id:'landcover',type:'fill',source:'osm','source-layer':'landcover',paint:{'fill-color':'#191e20','fill-opacity':.7}},
{id:'landuse',type:'fill',source:'osm','source-layer':'landuse',paint:{'fill-color':'#202427','fill-opacity':.65}},
{id:'water',type:'fill',source:'osm','source-layer':'water',paint:{'fill-color':'#080d10'}},
{id:'waterways',type:'line',source:'osm','source-layer':'waterway',paint:{'line-color':'#080d10','line-width':2}},
{id:'roads',type:'line',source:'osm','source-layer':'transportation',paint:{'line-color':'#353a3d','line-width':['interpolate',['linear'],['zoom'],10,.4,14,1.8,17,7],'line-opacity':.75}},
{id:'road-center',type:'line',source:'osm','source-layer':'transportation',filter:['in','class','motorway','trunk','primary'],paint:{'line-color':'#4a4c4c','line-width':['interpolate',['linear'],['zoom'],10,.5,16,2],'line-opacity':.7}},
{id:'buildings',type:'fill-extrusion',source:'osm','source-layer':'building',minzoom:12,paint:{'fill-extrusion-color':'#55595b','fill-extrusion-height':['coalesce',['get','render_height'],9],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1}},
]};
