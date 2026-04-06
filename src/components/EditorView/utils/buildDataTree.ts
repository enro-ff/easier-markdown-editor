import type { StoredMetaBase } from "./folderStore";
import type { DataNode } from "antd/es/tree";



const createTreeNode = (meta: StoredMetaBase) => {
    return {
        key: meta.id,
        title: meta.name,
        raw: meta,
        children: []
    }
}

const buildDataTree = (metaList: StoredMetaBase[]): TreeNode[] => {

    const TreeNodeList: TreeNode[] = [{
        key: 1,
        title: "root",
        raw: {
            id: 1,
            name: "root",
            type: "folder",
            parentId: 0,
            url: ".",
        },
        children: [],
    },
    {
        key: 2,
        title: "other",
        raw: {
            id: 2,
            name: "other",
            type: "folder",
            parentId: 0,
            url: "..",
        },
        children: [],
    }

    ]
    const IdMap = new Map<number, TreeNode>();
    IdMap.set(1, TreeNodeList[0]);
    IdMap.set(2, TreeNodeList[1]);
    metaList.forEach(meta => {
        if (IdMap.has(meta.id)) {
            return;
        }
        if (IdMap.has(meta.parentId)) {
            const TreeData = createTreeNode(meta);
            IdMap.get(meta.parentId)!.children.push(TreeData);
            IdMap.set(meta.id, TreeData);
        } else {
            IdMap.set(meta.id, createTreeNode(meta));
        }
    });
    return TreeNodeList;
}

export default buildDataTree;

export interface TreeNode extends DataNode {
    raw: StoredMetaBase;
    children: TreeNode[];
}

