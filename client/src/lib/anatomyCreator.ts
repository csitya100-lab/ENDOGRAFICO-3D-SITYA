import * as THREE from 'three';
import { AnatomyElement } from '@/lib/anatomyStore';

export type AnatomyMeshesMap = Record<AnatomyElement, THREE.Object3D[]>;

export function createProgrammaticAnatomy(
  anatomyGroup: THREE.Group,
  anatomyMeshes: AnatomyMeshesMap
): void {
  // Add uterosacral ligaments - positioned at uterus body/cervix junction
  const ligamentMaterial = new THREE.MeshStandardMaterial({
    color: 0xe08e8e,
    roughness: 0.4,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  
  // Right uterosacral ligament - from body/cervix junction going posteriorly (negative Z) and laterally
  const rightLigamentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, -0.5, -0.1),
    new THREE.Vector3(0.6, -0.8, -0.7),
    new THREE.Vector3(0.9, -1.2, -1.3),
    new THREE.Vector3(1.0, -1.5, -1.8),
  ]);
  const rightLigamentGeo = new THREE.TubeGeometry(rightLigamentCurve, 20, 0.08, 8, false);
  const rightLigament = new THREE.Mesh(rightLigamentGeo, ligamentMaterial);
  rightLigament.castShadow = true;
  rightLigament.receiveShadow = true;
  rightLigament.userData.anatomyType = 'uterosacrals';
  anatomyGroup.add(rightLigament);
  anatomyMeshes.uterosacrals.push(rightLigament);
  
  // Left uterosacral ligament - mirror of right (posterior direction)
  const leftLigamentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, -0.5, -0.1),
    new THREE.Vector3(-0.6, -0.8, -0.7),
    new THREE.Vector3(-0.9, -1.2, -1.3),
    new THREE.Vector3(-1.0, -1.5, -1.8),
  ]);
  const leftLigamentGeo = new THREE.TubeGeometry(leftLigamentCurve, 20, 0.08, 8, false);
  const leftLigament = new THREE.Mesh(leftLigamentGeo, ligamentMaterial);
  leftLigament.castShadow = true;
  leftLigament.receiveShadow = true;
  leftLigament.userData.anatomyType = 'uterosacrals';
  anatomyGroup.add(leftLigament);
  anatomyMeshes.uterosacrals.push(leftLigament);
  
  // Add ureters - thin tubes running laterally near the uterus
  const ureterMaterial = new THREE.MeshStandardMaterial({
    color: 0xffeebb,
    roughness: 0.3,
    metalness: 0.0,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  
  const rightUreterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.8, 1.5, -0.6),
    new THREE.Vector3(1.5, 0.5, -0.5),
    new THREE.Vector3(1.0, -0.3, -0.2),
    new THREE.Vector3(0.6, -0.8, 0.1),
    new THREE.Vector3(0.4, -1.1, 0.3),
  ]);
  const rightUreterGeo = new THREE.TubeGeometry(rightUreterCurve, 24, 0.04, 8, false);
  const rightUreter = new THREE.Mesh(rightUreterGeo, ureterMaterial);
  rightUreter.castShadow = true;
  rightUreter.receiveShadow = true;
  rightUreter.userData.anatomyType = 'ureters';
  anatomyGroup.add(rightUreter);
  anatomyMeshes.ureters.push(rightUreter);
  
  const leftUreterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.8, 1.5, -0.6),
    new THREE.Vector3(-1.5, 0.5, -0.5),
    new THREE.Vector3(-1.0, -0.3, -0.2),
    new THREE.Vector3(-0.6, -0.8, 0.1),
    new THREE.Vector3(-0.4, -1.1, 0.3),
  ]);
  const leftUreterGeo = new THREE.TubeGeometry(leftUreterCurve, 24, 0.04, 8, false);
  const leftUreter = new THREE.Mesh(leftUreterGeo, ureterMaterial);
  leftUreter.castShadow = true;
  leftUreter.receiveShadow = true;
  leftUreter.userData.anatomyType = 'ureters';
  anatomyGroup.add(leftUreter);
  anatomyMeshes.ureters.push(leftUreter);
  
  const roundLigamentMaterial = new THREE.MeshStandardMaterial({
    color: 0xe08e8e,
    roughness: 0.4,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  
  const rightRoundCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 1.45, 0.15),
    new THREE.Vector3(0.7, 1.35, 0.45),
    new THREE.Vector3(1.2, 1.0, 0.8),
    new THREE.Vector3(1.8, 0.5, 1.15),
    new THREE.Vector3(2.4, 0.1, 1.5),
  ]);
  const rightRoundGeo = new THREE.TubeGeometry(rightRoundCurve, 24, 0.045, 8, false);
  const rightRound = new THREE.Mesh(rightRoundGeo, roundLigamentMaterial);
  rightRound.castShadow = true;
  rightRound.receiveShadow = true;
  rightRound.userData.anatomyType = 'roundLigaments';
  anatomyGroup.add(rightRound);
  anatomyMeshes.roundLigaments.push(rightRound);
  
  const leftRoundCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 1.45, 0.15),
    new THREE.Vector3(-0.7, 1.35, 0.45),
    new THREE.Vector3(-1.2, 1.0, 0.8),
    new THREE.Vector3(-1.8, 0.5, 1.15),
    new THREE.Vector3(-2.4, 0.1, 1.5),
  ]);
  const leftRoundGeo = new THREE.TubeGeometry(leftRoundCurve, 24, 0.045, 8, false);
  const leftRound = new THREE.Mesh(leftRoundGeo, roundLigamentMaterial);
  leftRound.castShadow = true;
  leftRound.receiveShadow = true;
  leftRound.userData.anatomyType = 'roundLigaments';
  anatomyGroup.add(leftRound);
  anatomyMeshes.roundLigaments.push(leftRound);
  
  // Fallopian tubes (tubas uterinas) - positioned at cornual region, extending laterally
  // Anatomically: intramural → isthmus → ampulla → infundibulum with fimbriae
  const fallopianTubeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd67c7c,
    roughness: 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  
  // Fimbriae material - slightly different color for the finger-like ends
  const fimbriaeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd67c7c,
    roughness: 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  
  // Right fallopian tube - from cornual region extending laterally with slight posterior curve
  // Proportional to uterus: tubes are ~10-12cm, uterus body ~7-8cm
  const rightTubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 1.55, 0.0),      // Dentro da parede uterina (cornual)
    new THREE.Vector3(0.7, 1.58, -0.02),    // Emergindo da parede
    new THREE.Vector3(1.2, 1.55, -0.06),    // Istmo
    new THREE.Vector3(1.7, 1.48, -0.16),    // Início da ampola
    new THREE.Vector3(2.1, 1.38, -0.30),    // Ampola
    new THREE.Vector3(2.45, 1.28, -0.46),   // Fim da ampola / início do infundíbulo
    new THREE.Vector3(2.65, 1.18, -0.60),   // Infundíbulo - curva em direção ao ovário
  ]);
  
  // Variable radius for the tube - narrower at isthmus, wider at ampulla
  const rightTubeGeo = new THREE.TubeGeometry(rightTubeCurve, 32, 0.06, 8, false);
  const rightTube = new THREE.Mesh(rightTubeGeo, fallopianTubeMaterial);
  rightTube.castShadow = true;
  rightTube.receiveShadow = true;
  rightTube.userData.anatomyType = 'fallopianTubes';
  anatomyGroup.add(rightTube);
  anatomyMeshes.fallopianTubes.push(rightTube);
  
  // Right fimbriae - finger-like projections at the end of the tube
  const rightFimbriaeGroup = new THREE.Group();
  const fimbriaeBasePos = new THREE.Vector3(2.65, 1.18, -0.60);
  const fimbriaeCount = 6;
  for (let i = 0; i < fimbriaeCount; i++) {
    const angle = (i / fimbriaeCount) * Math.PI * 0.8 - Math.PI * 0.4; // Spread around the opening
    const fimbriaCurve = new THREE.CatmullRomCurve3([
      fimbriaeBasePos.clone(),
      new THREE.Vector3(
        fimbriaeBasePos.x + 0.15 + Math.random() * 0.1,
        fimbriaeBasePos.y + Math.sin(angle) * 0.2,
        fimbriaeBasePos.z - 0.1 + Math.cos(angle) * 0.15
      ),
      new THREE.Vector3(
        fimbriaeBasePos.x + 0.25 + Math.random() * 0.1,
        fimbriaeBasePos.y + Math.sin(angle) * 0.35,
        fimbriaeBasePos.z - 0.15 + Math.cos(angle) * 0.25
      ),
    ]);
    const fimbriaGeo = new THREE.TubeGeometry(fimbriaCurve, 8, 0.015, 6, false);
    const fimbria = new THREE.Mesh(fimbriaGeo, fimbriaeMaterial);
    fimbria.castShadow = true;
    fimbria.receiveShadow = true;
    rightFimbriaeGroup.add(fimbria);
  }
  rightFimbriaeGroup.userData.anatomyType = 'fallopianTubes';
  anatomyGroup.add(rightFimbriaeGroup);
  anatomyMeshes.fallopianTubes.push(rightFimbriaeGroup);
  
  // Left fallopian tube - mirror of right
  const leftTubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 1.55, 0.0),     // Dentro da parede uterina (cornual)
    new THREE.Vector3(-0.7, 1.58, -0.02),   // Emergindo da parede
    new THREE.Vector3(-1.2, 1.55, -0.06),   // Istmo
    new THREE.Vector3(-1.7, 1.48, -0.16),   // Início da ampola
    new THREE.Vector3(-2.1, 1.38, -0.30),   // Ampola
    new THREE.Vector3(-2.45, 1.28, -0.46),  // Fim da ampola / início do infundíbulo
    new THREE.Vector3(-2.65, 1.18, -0.60),  // Infundíbulo - curva em direção ao ovário
  ]);
  
  const leftTubeGeo = new THREE.TubeGeometry(leftTubeCurve, 32, 0.06, 8, false);
  const leftTube = new THREE.Mesh(leftTubeGeo, fallopianTubeMaterial);
  leftTube.castShadow = true;
  leftTube.receiveShadow = true;
  leftTube.userData.anatomyType = 'fallopianTubes';
  anatomyGroup.add(leftTube);
  anatomyMeshes.fallopianTubes.push(leftTube);
  
  // Left fimbriae - finger-like projections at the end of the tube
  const leftFimbriaeGroup = new THREE.Group();
  const leftFimbriaeBasePos = new THREE.Vector3(-2.65, 1.18, -0.60);
  for (let i = 0; i < fimbriaeCount; i++) {
    const angle = (i / fimbriaeCount) * Math.PI * 0.8 - Math.PI * 0.4;
    const fimbriaCurve = new THREE.CatmullRomCurve3([
      leftFimbriaeBasePos.clone(),
      new THREE.Vector3(
        leftFimbriaeBasePos.x - 0.15 - Math.random() * 0.1,
        leftFimbriaeBasePos.y + Math.sin(angle) * 0.2,
        leftFimbriaeBasePos.z - 0.1 + Math.cos(angle) * 0.15
      ),
      new THREE.Vector3(
        leftFimbriaeBasePos.x - 0.25 - Math.random() * 0.1,
        leftFimbriaeBasePos.y + Math.sin(angle) * 0.35,
        leftFimbriaeBasePos.z - 0.15 + Math.cos(angle) * 0.25
      ),
    ]);
    const fimbriaGeo = new THREE.TubeGeometry(fimbriaCurve, 8, 0.015, 6, false);
    const fimbria = new THREE.Mesh(fimbriaGeo, fimbriaeMaterial);
    fimbria.castShadow = true;
    fimbria.receiveShadow = true;
    leftFimbriaeGroup.add(fimbria);
  }
  leftFimbriaeGroup.userData.anatomyType = 'fallopianTubes';
  anatomyGroup.add(leftFimbriaeGroup);
  anatomyMeshes.fallopianTubes.push(leftFimbriaeGroup);
}
