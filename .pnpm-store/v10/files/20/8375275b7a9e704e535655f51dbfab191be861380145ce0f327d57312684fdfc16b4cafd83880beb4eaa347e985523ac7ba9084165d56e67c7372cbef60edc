/**
BSD 2-Clause License

Copyright (c) 2016-present, Yarn Contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/**
 * High-level node_modules hoisting algorithm recipe
 *
 * 1. Take input dependency graph and start traversing it,
 * as you visit new node in the graph - clone it if there can be multiple paths
 * to access the node from the graph root to the node, e.g. essentially represent
 * the graph with a tree as you go, to make hoisting possible.
 * 2. You want to hoist every node possible to the top root node first,
 * then to each of its children etc, so you need to keep track what is your current
 * root node into which you are hoisting
 * 3. Traverse the dependency graph from the current root node and for each package name
 * that can be potentially hoisted to the current root node build a list of idents
 * in descending hoisting preference. You will check in next steps whether most preferred ident
 * for the given package name can be hoisted first, and if not, then you check the
 * less preferred ident, etc, until either some ident will be hoisted
 * or you run out of idents to check
 * (no need to convert the graph to the tree when you build this preference map).
 * 4. The children of the root node are already "hoisted", so you need to start
 * from the dependencies of these children. You take some child and
 * sort its dependencies so that regular dependencies without peer dependencies
 * will come first and then those dependencies that peer depend on them.
 * This is needed to make algorithm more efficient and hoist nodes which are easier
 * to hoist first and then handle peer dependent nodes.
 * 5. You take this sorted list of dependencies and check if each of them can be
 * hoisted to the current root node. To answer is the node can be hoisted you check
 * your constraints - require promise and peer dependency promise.
 * The possible answers can be: YES - the node is hoistable to the current root,
 * NO - the node is not hoistable to the current root
 * and DEPENDS - the node is hoistable to the root if nodes X, Y, Z are hoistable
 * to the root. The case DEPENDS happens when all the require and other
 * constraints are met, except peer dependency constraints. Note, that the nodes
 * that are not package idents currently at the top of preference list are considered
 * to have the answer NO right away, before doing any other constraint checks.
 * 6. When you have hoistable answer for each dependency of a node you then build
 * a list of nodes that are NOT hoistable. These are the nodes that have answer NO
 * and the nodes that DEPENDS on these nodes. All the other nodes are hoistable,
 * those that have answer YES and those that have answer DEPENDS,
 * because they are cyclically dependent on each another
 * 7. You hoist all the hoistable nodes to the current root and continue traversing
 * the tree. Note, you need to track newly added nodes to the current root,
 * because after you finished tree traversal you want to come back to these new nodes
 * first thing and hoist everything from each of them to the current tree root.
 * 8. After you have finished traversing newly hoisted current root nodes
 * it means you cannot hoist anything to the current tree root and you need to pick
 * the next node as current tree root and run the algorithm again
 * until you run out of candidates for current tree root.
 */
type PackageName = string;
export declare enum HoisterDependencyKind {
    REGULAR = 0,
    WORKSPACE = 1,
    EXTERNAL_SOFT_LINK = 2
}
export type HoisterTree = {
    name: PackageName;
    identName: PackageName;
    reference: string;
    dependencies: Set<HoisterTree>;
    peerNames: Set<PackageName>;
    hoistPriority?: number;
    dependencyKind?: HoisterDependencyKind;
};
export type HoisterResult = {
    name: PackageName;
    identName: PackageName;
    references: Set<string>;
    dependencies: Set<HoisterResult>;
};
type Locator = string;
declare enum DebugLevel {
    NONE = -1,
    PERF = 0,
    CHECK = 1,
    REASONS = 2,
    INTENSIVE_CHECK = 9
}
export type HoistOptions = {
    /** Runs self-checks after hoisting is finished */
    check?: boolean;
    /** Debug level */
    debugLevel?: DebugLevel;
    /** Hoist borders are defined by parent node locator and its dependency name. The dependency is considered a border, nothing can be hoisted past this dependency, but dependency can be hoisted */
    hoistingLimits?: Map<Locator, Set<PackageName>>;
};
/**
 * Hoists package tree.
 *
 * The root node of a tree must has id: '.'.
 * This function does not mutate its arguments, it hoists and returns tree copy.
 *
 * @param tree package tree (cycles in the tree are allowed)
 *
 * @returns hoisted tree copy
 */
export declare const hoist: (tree: HoisterTree, opts?: HoistOptions) => HoisterResult;
export {};
