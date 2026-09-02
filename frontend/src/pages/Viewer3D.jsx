import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box,
  Layers,
  RotateCw,
  Maximize2,
  Building2,
  Sliders,
  Eye,
  Sun,
  Moon,
  Compass,
  MapPin,
  Crosshair,
  Zap,
  Info,
  Navigation,
  Sparkles,
  Layers3,
  Share2
} from 'lucide-react';
import axios from 'axios';

export default function Viewer3D({ selectedBuilding, initialFloor, onShareLocation }) {
  const mountRef = useRef(null);
  const [buildingData, setBuildingData] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(initialFloor !== undefined ? initialFloor : null);
  const [explodeValue, setExplodeValue] = useState(0); // 0 = stacked, 1 = exploded
  const [wireframeMode, setWireframeMode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(14); // 14:00 (2 PM)
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [copyNotice, setCopyNotice] = useState(null);

  useEffect(() => {
    if (initialFloor !== undefined && initialFloor !== null) {
      setSelectedFloor(initialFloor);
    }
  }, [initialFloor]);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshesRef = useRef([]);
  const laserRef = useRef(null);
  const targetRingRef = useRef(null);

  // Fetch full building details from API
  useEffect(() => {
    const loadBuilding = async () => {
      let bId = selectedBuilding?.properties?.id || selectedBuilding?.id;
      try {
        if (!bId) {
          const resB = await axios.get('/api/buildings', {
            params: { south: 28.61, west: 77.20, north: 28.62, east: 77.21 }
          });
          if (resB.data?.features?.length > 0) {
            bId = resB.data.features[0].id || resB.data.features[0].properties?.id;
          }
        }
        if (bId) {
          const res = await axios.get(`/api/buildings/${bId}`);
          setBuildingData(res.data);
        }
      } catch (err) {
        console.error("3D Viewer fetch error:", err);
      }
    };
    loadBuilding();
  }, [selectedBuilding]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Dynamic Sky / Background based on Time of Day
    const isNight = timeOfDay < 6 || timeOfDay > 19;
    const skyColor = isNight ? '#050811' : (timeOfDay > 17 ? '#1a102f' : '#070B14');
    scene.background = new THREE.Color(skyColor);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(50, 55, 65);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Prevent camera under ground
    controls.minDistance = 10;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(
      isNight ? 0x38bdf8 : 0xffffff, 
      isNight ? 0.4 : 0.9
    );
    scene.add(ambientLight);

    // Sun / Directional Light position calculated dynamically from timeOfDay
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
    const sunX = 90 * Math.cos(sunAngle);
    const sunY = Math.max(10, 90 * Math.sin(sunAngle));
    const sunZ = 50;

    const mainSunLight = new THREE.DirectionalLight(
      timeOfDay > 17 ? 0xf59e0b : (isNight ? 0x6366f1 : 0xffffff), 
      isNight ? 0.6 : 1.6
    );
    mainSunLight.position.set(sunX, sunY, sunZ);
    mainSunLight.castShadow = true;
    mainSunLight.shadow.mapSize.width = 2048;
    mainSunLight.shadow.mapSize.height = 2048;
    scene.add(mainSunLight);

    const fillLight = new THREE.DirectionalLight(0xc084fc, 0.4);
    fillLight.position.set(-40, 30, -40);
    scene.add(fillLight);

    // 6. Ground Grid & Radial Pulse Disc
    const grid = new THREE.GridHelper(160, 64, 0x38BDF8, 0x1E2E4A);
    grid.position.y = -0.01;
    scene.add(grid);

    // Glowing Ground Target Ring for Cursor Hover
    const ringGeo = new THREE.RingGeometry(0.5, 3.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const targetRing = new THREE.Mesh(ringGeo, ringMat);
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.y = 0.05;
    scene.add(targetRing);
    targetRingRef.current = targetRing;

    // Vertical Laser Beacon
    const laserMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.5, gapSize: 0.2, transparent: true, opacity: 0 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 50, 0)]);
    const laserLine = new THREE.Line(laserGeo, laserMat);
    scene.add(laserLine);
    laserRef.current = laserLine;

    // 7. Building Metadata & Geometry Parsing
    const bldgInfo = buildingData?.building || selectedBuilding?.properties || { levels: 8, height: 28, name: "3D Cadastral Tower A" };
    const levelsCount = bldgInfo.levels || 8;
    const totalHeight = bldgInfo.height || (levelsCount * 3.5);
    const floorHeight = totalHeight / levelsCount;

    // Extract exact GeoJSON polygon coordinates from building feature or DB record
    let rawCoords = null;
    if (selectedBuilding?.geometry?.coordinates) {
      rawCoords = selectedBuilding.geometry.coordinates;
    } else if (buildingData?.building?.geometry_json) {
      try {
        const parsed = typeof buildingData.building.geometry_json === 'string'
          ? JSON.parse(buildingData.building.geometry_json)
          : buildingData.building.geometry_json;
        rawCoords = parsed?.coordinates;
      } catch (e) {
        console.error("Error parsing geometry_json:", e);
      }
    }

    let ring = rawCoords;
    if (ring) {
      while (Array.isArray(ring[0]) && ring[0].length > 0 && Array.isArray(ring[0][0])) {
        ring = ring[0];
      }
    }

    let centerLat = selectedBuilding?.properties?.lat || 28.6139;
    let centerLon = selectedBuilding?.properties?.lon || 77.2090;
    let latScale = 111000 * 0.15;
    let lonScale = 111000 * Math.cos((centerLat * Math.PI) / 180) * 0.15;

    const shape = new THREE.Shape();

    if (ring && Array.isArray(ring) && ring.length >= 3) {
      const lats = ring.map(p => p[1]);
      const lons = ring.map(p => p[0]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      centerLat = (minLat + maxLat) / 2.0;
      centerLon = (minLon + maxLon) / 2.0;

      latScale = 111000 * 0.15;
      lonScale = 111000 * Math.cos((centerLat * Math.PI) / 180) * 0.15;

      ring.forEach((pt, idx) => {
        const x = (pt[0] - centerLon) * lonScale;
        const y = (pt[1] - centerLat) * latScale;
        if (idx === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();
    } else {
      // Default realistic architectural polygon footprint
      shape.moveTo(-16, -14);
      shape.lineTo(16, -14);
      shape.lineTo(16, 8);
      shape.lineTo(8, 16);
      shape.lineTo(-16, 16);
      shape.closePath();
    }

    // Controls Target Center
    controls.target.set(0, (totalHeight + explodeValue * levelsCount * 3) / 2, 0);

    // 8. Build 3D Extruded Floor Meshes with Glowing Cyber Edges
    const floorMeshes = [];

    for (let i = 0; i < levelsCount; i++) {
      const extrudeSettings = {
        depth: floorHeight * 0.92,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.18,
        bevelThickness: 0.18
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI / 2); // Orient extrusion vertically (Z -> Y)

      // Color scheme: Ground = Sky Cyan, Upper = Deep Indigo / Amber / Neon Violet
      let color = 0x3b82f6;
      if (i === 0) color = 0x0ea5e9;
      else if (i === levelsCount - 1) color = 0xa855f7;
      else if (i % 2 === 0) color = 0x6366f1;

      const isIsolated = selectedFloor !== null && selectedFloor !== i;

      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.2,
        metalness: 0.4,
        wireframe: wireframeMode,
        transparent: true,
        opacity: isIsolated ? 0.15 : 0.92,
        emissive: 0x000000,
        emissiveIntensity: 0.2
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Base Y Position including explosion spacing
      const baseElevation = i * (floorHeight + explodeValue * 4.5);
      mesh.position.y = baseElevation;

      // Attach floor metadata
      mesh.userData = {
        floorIndex: i,
        floorName: i === 0 ? "Ground Floor" : `Floor ${i}`,
        elevation: (i * floorHeight).toFixed(1),
        ulpin: bldgInfo.id ? `${bldgInfo.id}-L${i < 10 ? '0' + i : i}` : `ULPIN-L0${i}`,
        baseColor: color,
        centerLat,
        centerLon,
        latScale,
        lonScale
      };

      // Add Glowing Neon Edges
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeLineMat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x38bdf8 : (i === levelsCount - 1 ? 0xf472b6 : 0x818cf8),
        linewidth: 1.5,
        transparent: true,
        opacity: isIsolated ? 0.2 : 0.85
      });
      const edgeLines = new THREE.LineSegments(edges, edgeLineMat);
      mesh.add(edgeLines);

      scene.add(mesh);
      floorMeshes.push(mesh);
    }

    meshesRef.current = floorMeshes;

    // 9. Roof Shape Accessories (Dome, Pyramid, Tower Spire, Flat)
    const roofShapeType = bldgInfo.roof_shape || 'flat';
    const topY = levelsCount * (floorHeight + explodeValue * 4.5);

    if (roofShapeType === 'dome' || bldgInfo.building_type === 'monument') {
      const domeGeo = new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.7 });
      const domeMesh = new THREE.Mesh(domeGeo, domeMat);
      domeMesh.position.y = topY;
      scene.add(domeMesh);
    } else if (roofShapeType === 'pyramid') {
      const pyrGeo = new THREE.ConeGeometry(12, 10, 4);
      const pyrMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.25, metalness: 0.5 });
      const pyrMesh = new THREE.Mesh(pyrGeo, pyrMat);
      pyrMesh.rotation.y = Math.PI / 4;
      pyrMesh.position.y = topY + 5;
      scene.add(pyrMesh);
    } else if (bldgInfo.building_type === 'tower' || totalHeight > 45) {
      const spireGeo = new THREE.CylinderGeometry(0.2, 2.5, 14, 16);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 });
      const spireMesh = new THREE.Mesh(spireGeo, spireMat);
      spireMesh.position.y = topY + 7;
      scene.add(spireMesh);
    }

    // 10. Raycasting & Mouse Hover Coordinates Tracking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh = null;

    const handleMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(floorMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;
        const pt = hit.point;

        // Reset previous mesh emissive
        if (hoveredMesh && hoveredMesh !== mesh) {
          hoveredMesh.material.emissive.setHex(0x000000);
        }

        // Highlight hovered mesh
        hoveredMesh = mesh;
        mesh.material.emissive.setHex(0x1e3a8a);
        mesh.material.emissiveIntensity = 0.4;

        // Calculate exact Latitude and Longitude from 3D intersection point
        const hoverLon = centerLon + (pt.x / lonScale);
        const hoverLat = centerLat + (-pt.z / latScale);

        // Update Laser Beacon & Target Ring
        if (targetRingRef.current) {
          targetRingRef.current.position.set(pt.x, 0.05, pt.z);
          targetRingRef.current.material.opacity = 0.85;
        }
        if (laserRef.current) {
          const points = [new THREE.Vector3(pt.x, 0, pt.z), new THREE.Vector3(pt.x, pt.y, pt.z)];
          laserRef.current.geometry.setFromPoints(points);
          laserRef.current.material.opacity = 0.9;
        }

        // Set React state for 3D Cursor Telemetry HUD
        setHoveredInfo({
          lat: hoverLat,
          lon: hoverLon,
          floorIndex: mesh.userData.floorIndex,
          floorName: mesh.userData.floorName,
          elevation: mesh.userData.elevation,
          pointY: pt.y.toFixed(1),
          ulpin: mesh.userData.ulpin,
          screenX: event.clientX,
          screenY: event.clientY,
          bldgName: bldgInfo.name || `Building #${bldgInfo.id}`,
          bldgType: bldgInfo.building_type || 'residential'
        });
      } else {
        if (hoveredMesh) {
          hoveredMesh.material.emissive.setHex(0x000000);
          hoveredMesh = null;
        }
        if (targetRingRef.current) targetRingRef.current.material.opacity = 0;
        if (laserRef.current) laserRef.current.material.opacity = 0;
        setHoveredInfo(null);
      }
    };

    const handleCanvasClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(floorMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;
        const pt = hit.point;

        const clickLon = centerLon + (pt.x / lonScale);
        const clickLat = centerLat + (-pt.z / latScale);
        const flrIdx = mesh.userData.floorIndex;
        const elev = mesh.userData.elevation;

        // 3-Element Token String: "Latitude, Longitude, Floor"
        const token3Elem = `${clickLat.toFixed(6)}, ${clickLon.toFixed(6)}, L${flrIdx}`;
        navigator.clipboard.writeText(token3Elem);

        setCopyNotice(`Copied 3D Location Token (${clickLat.toFixed(6)}°, ${clickLon.toFixed(6)}°, Floor ${flrIdx} / ${elev}m) to clipboard!`);
        setTimeout(() => setCopyNotice(null), 3500);

        setSelectedFloor(flrIdx);
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 11. Animation Loop
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      controls.update();

      if (autoRotate && controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;
      } else if (controls) {
        controls.autoRotate = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        renderer.domElement.removeEventListener('click', handleCanvasClick);
        if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [buildingData, selectedBuilding, selectedFloor, explodeValue, wireframeMode, autoRotate, timeOfDay]);

  // Camera View Quick Switcher Functions
  const setCameraView = (viewMode) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const bldgInfo = buildingData?.building || selectedBuilding?.properties || { height: 28, levels: 8 };
    const h = bldgInfo.height || 28;

    if (viewMode === '3D') {
      cameraRef.current.position.set(50, 55, 65);
      controlsRef.current.target.set(0, h / 2, 0);
    } else if (viewMode === 'TOP') {
      cameraRef.current.position.set(0, h + 80, 0.01);
      controlsRef.current.target.set(0, 0, 0);
    } else if (viewMode === 'FRONT') {
      cameraRef.current.position.set(0, h / 2, h + 70);
      controlsRef.current.target.set(0, h / 2, 0);
    }
    controlsRef.current.update();
  };

  const bldgInfo = buildingData?.building || selectedBuilding?.properties || { levels: 8, height: 28, name: "3D Cadastral Tower A" };
  const levelsCount = bldgInfo.levels || 8;
  const grossArea = Math.round((bldgInfo.height || 28) * 48);
  const totalVolume = Math.round(grossArea * (bldgInfo.height || 28));

  return (
    <div className="relative w-full h-full bg-[#070B14] overflow-hidden flex flex-col select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* 3D Cursor Raycast Hover Telemetry HUD Card (Following Cursor) */}
      {hoveredInfo && (
        <div 
          style={{ 
            left: Math.min(hoveredInfo.screenX + 16, window.innerWidth - 300), 
            top: Math.min(hoveredInfo.screenY + 16, window.innerHeight - 250) 
          }}
          className="fixed z-50 bg-[#0B1120]/95 backdrop-blur-md border border-sky-500/50 p-4 rounded-2xl shadow-2xl shadow-sky-500/20 text-slate-100 pointer-events-none w-72 animate-in fade-in zoom-in duration-150 space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-2">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5 font-mono">
              <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>3D Spatial Inspection</span>
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold rounded">
              LIDAR HIT
            </span>
          </div>

          {/* Latitude & Longitude Readouts */}
          <div className="bg-[#131D31] p-2.5 rounded-xl border border-[#1E2E4A] space-y-1 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> LATITUDE:
              </span>
              <span className="text-sky-300 font-bold">{hoveredInfo.lat.toFixed(6)}° N</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" /> LONGITUDE:
              </span>
              <span className="text-emerald-300 font-bold">{hoveredInfo.lon.toFixed(6)}° E</span>
            </div>
          </div>

          {/* Floor & Height Telemetry */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="bg-[#131D31] p-2 rounded-xl border border-[#1E2E4A]">
              <span className="text-slate-400 block text-[9px]">FLOOR LEVEL</span>
              <span className="text-amber-400 font-bold text-xs">{hoveredInfo.floorName}</span>
            </div>
            <div className="bg-[#131D31] p-2 rounded-xl border border-[#1E2E4A]">
              <span className="text-slate-400 block text-[9px]">ELEVATION</span>
              <span className="text-purple-300 font-bold text-xs">{hoveredInfo.elevation}m ASL</span>
            </div>
          </div>

          {/* ULPIN Code Pill & Tap Hint */}
          <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/30 font-mono text-[10px] text-sky-300 flex items-center justify-between">
            <span className="text-slate-400">ULPIN:</span>
            <span className="font-bold tracking-tight">{hoveredInfo.ulpin}</span>
          </div>
          <p className="text-[9px] font-mono text-center text-amber-400/90 animate-pulse">
            👆 Click floor to copy 3D location token
          </p>
        </div>
      )}

      {/* Copy Location Confirmation Toast */}
      {copyNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0B1120] border border-emerald-500/60 px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-3 animate-in fade-in zoom-in duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{copyNotice}</span>
        </div>
      )}

      {/* Top Left Building Identity Telemetry Badge */}
      <div className="absolute top-4 left-4 z-10 bg-[#0B1120]/90 backdrop-blur border border-[#1E2E4A] p-3.5 rounded-2xl shadow-2xl flex items-center gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-xs tracking-tight">{bldgInfo.name || `Building #${bldgInfo.id}`}</h2>
            <p className="text-[10px] text-sky-400/90 font-mono flex items-center gap-1.5 mt-0.5">
              <span>ULPIN: {bldgInfo.id || 'ULPIN-DEL-2026-001'}</span>
              <span>•</span>
              <span className="capitalize text-amber-400">{bldgInfo.building_type || 'residential'}</span>
            </p>
          </div>
        </div>

        <div className="h-7 w-px bg-[#1E2E4A]" />

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div>
            <span className="text-slate-400 block text-[9px]">TOTAL FLOORS</span>
            <span className="text-sky-300 font-bold">{levelsCount} Levels</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">HEIGHT</span>
            <span className="text-emerald-300 font-bold">{bldgInfo.height || 28}m</span>
          </div>
          <button
            onClick={() => onShareLocation && onShareLocation(buildingData?.building || selectedBuilding, selectedFloor)}
            className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl transition-all shadow-md ml-1"
            title="Share 3D Location & Export Cadastre"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Center Camera Preset Quick Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#0B1120]/90 backdrop-blur border border-[#1E2E4A] p-1.5 rounded-2xl shadow-2xl hidden md:flex items-center gap-1">
        <button
          onClick={() => setCameraView('3D')}
          className="px-3 py-1.5 bg-[#131D31] hover:bg-[#182642] border border-[#1E2E4A] rounded-xl text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5 transition-all"
        >
          <Layers3 className="w-3.5 h-3.5 text-sky-400" />
          <span>3D Isometric</span>
        </button>
        <button
          onClick={() => setCameraView('TOP')}
          className="px-3 py-1.5 bg-[#131D31] hover:bg-[#182642] border border-[#1E2E4A] rounded-xl text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5 transition-all"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>2D Top-Down</span>
        </button>
        <button
          onClick={() => setCameraView('FRONT')}
          className="px-3 py-1.5 bg-[#131D31] hover:bg-[#182642] border border-[#1E2E4A] rounded-xl text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5 transition-all"
        >
          <Building2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Front Elevation</span>
        </button>
      </div>

      {/* Bottom Left Floor Isolator Toolbar */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0B1120]/90 backdrop-blur border border-[#1E2E4A] p-3 rounded-2xl shadow-2xl flex items-center gap-1.5 overflow-x-auto max-w-xl">
        <span className="text-[10px] font-mono text-slate-400 px-1 font-bold flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-sky-400" /> ISOLATOR:
        </span>
        <button
          onClick={() => setSelectedFloor(null)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
            selectedFloor === null ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-[#131D31] text-slate-400 hover:text-white border border-[#1E2E4A]'
          }`}
        >
          ALL FLOORS
        </button>
        {Array.from({ length: levelsCount }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedFloor(idx)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
              selectedFloor === idx ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-[#131D31] text-slate-400 hover:text-white border border-[#1E2E4A]'
            }`}
          >
            L{idx}
          </button>
        ))}
      </div>

      {/* Right Controls Inspector Panel */}
      <div className="absolute top-4 right-4 z-10 bg-[#0B1120]/90 backdrop-blur border border-[#1E2E4A] p-5 rounded-2xl shadow-2xl text-xs w-80 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-3">
          <span className="font-bold flex items-center gap-2 text-white">
            <Sliders className="w-4 h-4 text-sky-400" />
            3D Cadastral Controls
          </span>
          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono text-[10px] font-bold rounded-md border border-sky-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> HIGH-PRECISION
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="bg-[#131D31] p-2 rounded-xl border border-[#1E2E4A] text-center">
            <span className="text-slate-500 block">HEIGHT</span>
            <span className="text-sky-300 font-bold text-xs">{bldgInfo.height || 28}m</span>
          </div>
          <div className="bg-[#131D31] p-2 rounded-xl border border-[#1E2E4A] text-center">
            <span className="text-slate-500 block">GROSS AREA</span>
            <span className="text-emerald-300 font-bold text-xs">{grossArea} m²</span>
          </div>
          <div className="bg-[#131D31] p-2 rounded-xl border border-[#1E2E4A] text-center">
            <span className="text-slate-500 block">VOLUME</span>
            <span className="text-purple-300 font-bold text-xs">{totalVolume} m³</span>
          </div>
        </div>

        {/* Vertical Floor Explosion Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Vertical Floor Explosion
            </span>
            <span className="text-purple-400 font-bold">{(explodeValue * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={explodeValue}
            onChange={(e) => setExplodeValue(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#070B14] rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>

        {/* Solar Time of Day Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              {timeOfDay < 6 || timeOfDay > 19 ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              Solar Sunlight Position
            </span>
            <span className="text-amber-400 font-bold">{timeOfDay}:00 hrs</span>
          </div>
          <input
            type="range"
            min="6"
            max="22"
            step="1"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#070B14] rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Toggle Controls */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2.5 rounded-xl border text-[11px] font-mono font-semibold flex items-center justify-center gap-2 transition-all ${
              autoRotate ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-md' : 'bg-[#131D31] border-[#1E2E4A] text-slate-400'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>Auto Orbit</span>
          </button>

          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`p-2.5 rounded-xl border text-[11px] font-mono font-semibold flex items-center justify-center gap-2 transition-all ${
              wireframeMode ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-md' : 'bg-[#131D31] border-[#1E2E4A] text-slate-400'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Wireframe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
