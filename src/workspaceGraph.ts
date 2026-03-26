import path from 'path';
import {
  KpaWorkspaceIndex,
  type KpaWorkspaceComponentUsages,
  type KpaWorkspaceIndexOptions,
} from './language/workspaceIndex';
import type { KpaWorkspaceFileDiagnostics, KpaWorkspaceSymbolEntry } from './language/core';
import {
  clearProjectConfigCache,
  getNearestProjectConfigPath,
  invalidateProjectConfigCacheForPath,
} from './language/projectConfig';
import {
  collectImportedKpaComponents,
  collectWorkspaceTemplateComponentUsagesForResolvedFile,
} from './language/templateComponents';

interface GraphNodeState {
  configPath?: string;
  dependencies: ReadonlySet<string>;
}

const projectConfigFileNames = new Set(['jsconfig.json', 'tsconfig.json']);

export interface KpaWorkspaceGraphOptions extends KpaWorkspaceIndexOptions {}

export class KpaWorkspaceGraph {
  private dependenciesByFile = new Map<string, ReadonlySet<string>>();
  private dependentsByFile = new Map<string, Set<string>>();
  private nodeStatesByFile = new Map<string, GraphNodeState>();
  private overlayTextByPath = new Map<string, string>();
  private rootPaths: readonly string[] = [];
  private workspaceIndex: KpaWorkspaceIndex;

  constructor(options: KpaWorkspaceGraphOptions = {}) {
    this.workspaceIndex = new KpaWorkspaceIndex(options);
    this.rootPaths = options.rootPaths ?? [];

    for (const [filePath, text] of options.overlayTextByPath ?? new Map()) {
      this.overlayTextByPath.set(filePath, text);
    }
  }

  setRootPaths(rootPaths: readonly string[]): void {
    this.rootPaths = rootPaths;
    this.workspaceIndex.setRootPaths(rootPaths);
  }

  setOverlayText(filePath: string, text: string): readonly string[] {
    this.overlayTextByPath.set(filePath, text);
    this.workspaceIndex.setOverlayTextByPath(this.overlayTextByPath);
    return this.invalidatePath(filePath);
  }

  deleteOverlayText(filePath: string): readonly string[] {
    this.overlayTextByPath.delete(filePath);
    this.workspaceIndex.setOverlayTextByPath(this.overlayTextByPath);
    return this.invalidatePath(filePath);
  }

  invalidatePath(filePath: string): readonly string[] {
    const normalizedFilePath = path.resolve(filePath);

    if (projectConfigFileNames.has(path.basename(normalizedFilePath))) {
      clearProjectConfigCache();
      const allKpaFiles = this.getKpaFilePaths([normalizedFilePath]);

      for (const affectedPath of allKpaFiles) {
        this.removeNodeState(affectedPath);
        this.workspaceIndex.invalidateFile(affectedPath);
      }

      return allKpaFiles;
    }

    if (/\.(?:[cm]?js|jsx|ts|tsx)$/.test(normalizedFilePath)) {
      invalidateProjectConfigCacheForPath(normalizedFilePath);
      const allKpaFiles = this.getKpaFilePaths([normalizedFilePath]);

      for (const affectedPath of allKpaFiles) {
        this.removeNodeState(affectedPath);
        this.workspaceIndex.invalidateFile(affectedPath);
      }

      return allKpaFiles;
    }

    const affectedPaths = this.collectAffectedKpaPaths(normalizedFilePath);

    for (const affectedPath of affectedPaths) {
      this.removeNodeState(affectedPath);
      this.workspaceIndex.invalidateFile(affectedPath);
    }

    invalidateProjectConfigCacheForPath(normalizedFilePath);

    return affectedPaths;
  }

  getKpaFilePaths(additionalPaths: readonly (string | undefined)[] = []): readonly string[] {
    this.syncWorkspaceIndex();
    return this.workspaceIndex.getKpaFilePaths(additionalPaths);
  }

  collectWorkspaceSymbols(
    query = '',
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceSymbolEntry[] {
    this.ensureWorkspaceState(additionalPaths);
    return this.workspaceIndex.collectWorkspaceSymbols(query, additionalPaths);
  }

  collectDiagnosticsForPaths(
    paths: readonly string[],
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceFileDiagnostics[] {
    this.ensureWorkspaceState([...paths, ...additionalPaths]);
    return this.workspaceIndex.collectDiagnosticsForPaths(paths, additionalPaths);
  }

  findComponentFilePathsByName(
    componentName: string,
    excludePath?: string,
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly string[] {
    this.ensureWorkspaceState(additionalPaths);
    return this.workspaceIndex.findComponentFilePathsByName(
      componentName,
      excludePath,
      additionalPaths,
    );
  }

  findBestComponentFilePathByName(
    componentName: string,
    sourcePath: string,
    additionalPaths: readonly (string | undefined)[] = [],
  ): string | undefined {
    const candidates = this.findComponentFilePathsByName(
      componentName,
      sourcePath,
      additionalPaths,
    );

    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    const rankedCandidates = candidates
      .map((candidatePath) => ({
        candidatePath,
        score: scoreComponentCandidate(sourcePath, candidatePath),
      }))
      .sort((left, right) => left.score - right.score);
    const bestCandidate = rankedCandidates[0];
    const nextBestCandidate = rankedCandidates[1];

    if (!bestCandidate) {
      return undefined;
    }

    if (!nextBestCandidate || bestCandidate.score < nextBestCandidate.score) {
      return bestCandidate.candidatePath;
    }

    return undefined;
  }

  collectComponentUsagesForResolvedFile(
    resolvedFilePath: string,
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceComponentUsages[] {
    const normalizedResolvedFilePath = path.resolve(resolvedFilePath);

    this.ensureWorkspaceState([normalizedResolvedFilePath, ...additionalPaths]);

    const dependentPaths = this.dependentsByFile.get(normalizedResolvedFilePath);

    if (!dependentPaths || dependentPaths.size === 0) {
      return this.workspaceIndex.collectComponentUsagesForResolvedFile(
        normalizedResolvedFilePath,
        additionalPaths,
      );
    }

    const usages: KpaWorkspaceComponentUsages[] = [];

    for (const dependentPath of [...dependentPaths].sort()) {
      const indexedFile = this.workspaceIndex.getIndexedFile(dependentPath);

      if (!indexedFile) {
        continue;
      }

      const componentUsages = collectWorkspaceTemplateComponentUsagesForResolvedFile(
        indexedFile.document,
        dependentPath,
        normalizedResolvedFilePath,
      );

      if (componentUsages.length === 0) {
        continue;
      }

      usages.push({
        filePath: dependentPath,
        usages: componentUsages,
      });
    }

    return usages;
  }

  private ensureWorkspaceState(additionalPaths: readonly (string | undefined)[]): void {
    this.syncWorkspaceIndex();

    for (const filePath of this.workspaceIndex.getKpaFilePaths(additionalPaths)) {
      this.ensureNodeState(filePath);
    }
  }

  private syncWorkspaceIndex(): void {
    this.workspaceIndex.setRootPaths(this.rootPaths);
    this.workspaceIndex.setOverlayTextByPath(this.overlayTextByPath);
  }

  private ensureNodeState(filePath: string): GraphNodeState | undefined {
    const normalizedFilePath = path.resolve(filePath);
    const existingState = this.nodeStatesByFile.get(normalizedFilePath);

    if (existingState) {
      return existingState;
    }

    const indexedFile = this.workspaceIndex.getIndexedFile(normalizedFilePath);

    if (!indexedFile) {
      return undefined;
    }

    const dependencies = new Set<string>();

    for (const component of collectImportedKpaComponents(
      indexedFile.document,
      normalizedFilePath,
    )) {
      if (component.resolvedFilePath) {
        dependencies.add(path.resolve(component.resolvedFilePath));
      }
    }

    const nextState: GraphNodeState = {
      configPath: getNearestProjectConfigPath(normalizedFilePath),
      dependencies,
    };

    this.nodeStatesByFile.set(normalizedFilePath, nextState);
    this.dependenciesByFile.set(normalizedFilePath, dependencies);

    for (const dependencyPath of dependencies) {
      const dependents = this.dependentsByFile.get(dependencyPath) ?? new Set<string>();

      dependents.add(normalizedFilePath);
      this.dependentsByFile.set(dependencyPath, dependents);
    }

    return nextState;
  }

  private removeNodeState(filePath: string): void {
    const normalizedFilePath = path.resolve(filePath);
    const dependencies = this.dependenciesByFile.get(normalizedFilePath);

    if (dependencies) {
      for (const dependencyPath of dependencies) {
        const dependents = this.dependentsByFile.get(dependencyPath);

        if (!dependents) {
          continue;
        }

        dependents.delete(normalizedFilePath);

        if (dependents.size === 0) {
          this.dependentsByFile.delete(dependencyPath);
        }
      }
    }

    this.dependenciesByFile.delete(normalizedFilePath);
    this.nodeStatesByFile.delete(normalizedFilePath);
  }

  private collectAffectedKpaPaths(filePath: string): readonly string[] {
    const affectedPaths = new Set<string>();
    const pendingPaths = [filePath];

    while (pendingPaths.length > 0) {
      const currentPath = pendingPaths.shift();

      if (!currentPath || affectedPaths.has(currentPath)) {
        continue;
      }

      affectedPaths.add(currentPath);

      const dependents = this.dependentsByFile.get(currentPath);

      if (!dependents) {
        continue;
      }

      for (const dependentPath of dependents) {
        pendingPaths.push(dependentPath);
      }
    }

    return [...affectedPaths].filter((candidatePath) => candidatePath.endsWith('.kpa'));
  }
}

function scoreComponentCandidate(sourcePath: string, targetPath: string): number {
  const relativePath = path.relative(path.dirname(sourcePath), targetPath).replace(/\\/g, '/');
  const segmentCount = relativePath.split('/').filter((segment) => segment.length > 0).length;
  const parentPenalty = relativePath.startsWith('..') ? 50 : 0;
  const sameDirectoryBonus =
    path.dirname(sourcePath) === path.dirname(targetPath)
      ? targetPath.endsWith('/index.kpa') || targetPath.endsWith('\\index.kpa')
        ? -5
        : -10
      : 0;

  return parentPenalty + segmentCount + sameDirectoryBonus;
}
