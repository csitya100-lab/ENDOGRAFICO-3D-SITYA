import * as THREE from 'three';
import { AnatomyElement } from '@/lib/anatomyStore';
import { AnatomyMeshesMap } from '@/lib/anatomyCreator';

export function processGLBModel(
  model: THREE.Group,
  anatomyGroup: THREE.Group,
  anatomyMeshes: AnatomyMeshesMap,
  options: { isIOS: boolean; isMobile: boolean }
): void {
  const { isIOS: isIOSDevice, isMobile: isMobileDevice } = options;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.x += (model.position.x - center.x);
  model.position.y += (model.position.y - center.y);
  model.position.z += (model.position.z - center.z);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 4 / maxDim;
  model.scale.set(scale, scale, scale);

  model.traverse((child: any) => {
      if ((child as THREE.Mesh).isMesh && child !== model) {
          const mesh = child as THREE.Mesh;

          const meshNameLow = mesh.name.toLowerCase();
          if (meshNameLow.includes('sacro') || 
              meshNameLow.includes('ligament') || 
              meshNameLow.includes('uterosacral') ||
              meshNameLow.includes('round')) {
            mesh.visible = false;
            return;
          }

          let originalColor = new THREE.Color(0xffffff);
          let originalMat = mesh.material;
          if (Array.isArray(originalMat)) {
              originalMat = originalMat[0];
          }
          if (originalMat instanceof THREE.MeshStandardMaterial || originalMat instanceof THREE.MeshPhongMaterial) {
              originalColor = (originalMat as any).color.clone();
          }

          const r = originalColor.r;
          const g = originalColor.g;
          const b = originalColor.b;

          let newColor = new THREE.Color(0xd67c7c);
          let roughness = 0.4;
          let metalness = 0.05;
          let clearcoat = isIOSDevice ? 0 : 0.1;
          let clearcoatRoughness = 0.3;
          let envMapIntensity = 0.5;
          let transparent = false;
          let opacity = 1.0;

          if (r > 0.8 && g > 0.8 && b < 0.4) {
              newColor = new THREE.Color(0xffe6a0);
              roughness = 0.1;
              metalness = 0.1;
              transparent = true;
              opacity = 0.3;
          }
          else if (r < 0.4 && g > 0.7 && b > 0.8) {
              newColor = new THREE.Color(0xffeebb);
              roughness = 0.3;
              metalness = 0.0;
              transparent = true;
              opacity = 0.6;
          }
          else if (r > 0.7 && g > 0.4 && b > 0.3 && r - g > 0.2) {
              newColor = new THREE.Color(0xd48c8c);
              roughness = 0.5;
              metalness = 0.0;
              clearcoat = 0;
          }
          else if (r > 0.6 && g > 0.4 && b > 0.3 && r - g < 0.3) {
              newColor = new THREE.Color(0xe08e8e);
              roughness = 0.4;
              metalness = 0.0;
              clearcoat = 0;
          }
          else if (r > 0.8 && g < 0.7 && b < 0.7 && r - g < 0.3) {
              newColor = new THREE.Color(0xe8dcc5);
              roughness = 0.5;
              metalness = 0.0;
              clearcoat = isIOSDevice ? 0 : 0.1;
              envMapIntensity = 0.3;
          }

          let newMaterial: THREE.Material;
          if (isIOSDevice || isMobileDevice) {
              newMaterial = new THREE.MeshStandardMaterial({
                  color: newColor,
                  roughness: roughness,
                  metalness: metalness,
                  transparent: transparent,
                  opacity: opacity,
                  side: THREE.DoubleSide
              });
          } else {
              const physicalParams: any = {
                  color: newColor,
                  roughness: roughness,
                  metalness: metalness,
                  clearcoat: clearcoat,
                  clearcoatRoughness: clearcoatRoughness,
                  envMapIntensity: envMapIntensity,
                  transparent: transparent,
                  opacity: opacity,
                  side: THREE.DoubleSide
              };
              if (transparent && opacity < 0.5) {
                  physicalParams.transmission = 0.1;
                  physicalParams.thickness = 0.2;
              }
              newMaterial = new THREE.MeshPhysicalMaterial(physicalParams);
          }

          mesh.material = newMaterial;
          if (!isIOSDevice && !isMobileDevice) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
          }
      }
  });

  anatomyGroup.add(model);

  // Identify bladder by position (most anterior mesh - highest Z value)
  // Filter out utero-ovarian and cardinal ligaments (elongated tubular meshes)
  const allMeshes: THREE.Mesh[] = [];
  model.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      allMeshes.push(child as THREE.Mesh);
    }
  });

  // Analyze each mesh to identify ligaments vs organs
  // Ligaments are elongated (high aspect ratio), organs are more spherical
  const meshAnalysis: { mesh: THREE.Mesh; isLigament: boolean; centerZ: number; centerX: number; volume: number; aspectRatio: number; isBeige: boolean; isLateral: boolean }[] = [];

  allMeshes.forEach((mesh) => {
    if (!mesh.visible) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (box) {
      const sizeX = box.max.x - box.min.x;
      const sizeY = box.max.y - box.min.y;
      const sizeZ = box.max.z - box.min.z;
      const centerX = (box.min.x + box.max.x) / 2;
      const centerZ = (box.min.z + box.max.z) / 2;
      const volume = sizeX * sizeY * sizeZ;

      // Calculate aspect ratio - ligaments are elongated (max dimension >> min dimension)
      const dims = [sizeX, sizeY, sizeZ].sort((a, b) => b - a);
      const aspectRatio = dims[0] / Math.max(dims[2], 0.01);

      // Get mesh color
      const material = mesh.material as THREE.MeshStandardMaterial;
      const r = material?.color?.r ?? 0;
      const g = material?.color?.g ?? 0;
      const b = material?.color?.b ?? 0;

      // Utero-ovarian ligaments: lateral position + specific volume range
      // Looking at data: volume ~2.664, centerX ~±1.94
      const isBeige = g > 0.30 && r > g; // relaxed beige detection
      const isVeryLateral = Math.abs(centerX) > 1.5; // far from center
      const isLateral = Math.abs(centerX) > 0.5;
      const isUteroOvarianVolume = volume > 2.0 && volume < 4.0; // volume ~2.664

      // Utero-ovarian ligament: very lateral + specific volume
      const isUteroOvarianLigament = isVeryLateral && isUteroOvarianVolume;

      // Cardinal ligaments: volume ~2.744, centered (centerX ~0)
      const isCardinalVolume = volume > 2.5 && volume < 3.0;
      const isCentered = Math.abs(centerX) < 0.5;
      const isCardinalLigament = isCardinalVolume && isCentered;

      // Also hide very small structures
      const isSmallLigament = volume < 0.5;

      const isLigament = isUteroOvarianLigament || isCardinalLigament || isSmallLigament;

      meshAnalysis.push({ mesh, isLigament, centerZ, centerX, volume, aspectRatio, isBeige, isLateral });
    }
  });

  const meshNameToAnatomy: Record<string, AnatomyElement> = {
    'uterus': 'uterus',
    'cervix': 'cervix',
    'leftOvary': 'ovaries',
    'rightOvary': 'ovaries',
    'bladder': 'bladder',
    'rectum': 'rectum',
    'intestine': 'intestine',
    'leftUterosacrallLigament': 'uterosacrals',
    'rightUterosacrallLigament': 'uterosacrals',
  };

  meshAnalysis.forEach(({ mesh, isLigament, centerX }) => {
    const mappedType = meshNameToAnatomy[mesh.name];
    if (mappedType) {
      mesh.visible = true;
      mesh.userData.anatomyType = mappedType;
      anatomyMeshes[mappedType].push(mesh);
    } else if (isLigament) {
      mesh.visible = false;
    } else if (Math.abs(centerX) > 1.2 && mesh.geometry.boundingBox) {
      mesh.visible = true;
      const box = mesh.geometry.boundingBox;
      const vol = (box.max.x - box.min.x) * (box.max.y - box.min.y) * (box.max.z - box.min.z);
      if (vol < 0.5) {
        mesh.userData.anatomyType = 'ureters';
        anatomyMeshes.ureters.push(mesh);
      } else {
        mesh.userData.anatomyType = 'ovaries';
        anatomyMeshes.ovaries.push(mesh);
      }
    } else {
      mesh.visible = true;
      mesh.userData.anatomyType = 'uterus';
      anatomyMeshes.uterus.push(mesh);
    }
  });
}
