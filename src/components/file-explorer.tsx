"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, FolderOpen, File as FileIcon, Plus } from "lucide-react"

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
  expanded?: boolean
}

declare global {
  interface Window {
    electronAPI: {
      readDirectory: (path: string) => Promise<FileEntry[]>
      openFolderDialog: () => Promise<string | null>
      watchDirectory: (path: string) => void
      unwatchDirectory: (path: string) => void
      onDirectoryChanged: (handler: (path: string) => void) => void
      moveFile: (filePath: string, targetPath: string) => Promise<void>
    }
  }
}

function FileNode({
  node,
  depth = 0,
  onToggle,
  onSelect,
  selectedPath,
  onMove,
}: {
  node: FileEntry
  depth?: number
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  selectedPath: string | null
  onMove: (src: string, dest: string) => void
}) {
  const isSelected = node.path === selectedPath

  // 拖拽开始，设置拖拽数据为当前文件路径
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.setData("text/plain", node.path)
    e.dataTransfer.effectAllowed = "move"
  }

  // 拖拽到文件夹时允许放置
  const handleDragOver = (e: React.DragEvent) => {
    if (node.isDirectory) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    }
  }

  // 拖拽释放，移动文件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (node.isDirectory) {
      const srcPath = e.dataTransfer.getData("text/plain")
      if (srcPath && srcPath !== node.path) {
        onMove(srcPath, node.path)
      }
    }
  }

  return (
    <div
      style={{ paddingLeft: `${depth * 20}px` }} // 使用内联样式实现层级缩进
      draggable={!node.isDirectory}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Button
        variant={isSelected ? "secondary" : "ghost"}
        size="sm"
        className="w-full justify-start rounded flex gap-2"
        onClick={() => {
          if (node.isDirectory) {
            onToggle(node.path)
          } else {
            onSelect(node.path)
          }
        }}
      >
        {node.isDirectory ? (
          node.expanded ? <FolderOpen size={18} /> : <Folder size={18} />
        ) : (
          <FileIcon size={18} />
        )}
        <span className="truncate">{node.name}</span>
      </Button>
      {node.expanded &&
        node.children?.map((child) => (
          <FileNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onToggle={onToggle}
            onSelect={onSelect}
            selectedPath={selectedPath}
            onMove={onMove}
          />
        ))}
    </div>
  )
}

export function AppSidebar() {
  const [tree, setTree] = useState<FileEntry | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [rootPath, setRootPath] = useState<string | null>(null)

  const loadDirectory = useCallback(async (path: string) => {
    try {
      const entries = await window.electronAPI.readDirectory(path)
      setTree({
        name: path,
        path,
        isDirectory: true,
        expanded: true,
        children: entries,
      })
      setRootPath(path)
      setSelectedPath(null)
    } catch (err) {
      console.error("读取目录失败:", err)
    }
  }, [])

  useEffect(() => {
    // 可选：默认打开某目录
    // loadDirectory("C:/Users")
  }, [loadDirectory])

  const toggleFolder = useCallback(
    async (path: string) => {
      const updateTree = async (node: FileEntry): Promise<FileEntry> => {
        if (node.path === path) {
          if (node.expanded) {
            return { ...node, expanded: false }
          } else {
            const children =
              node.children ?? (await window.electronAPI.readDirectory(node.path))
            return { ...node, expanded: true, children }
          }
        }
        if (node.children) {
          const updatedChildren = await Promise.all(
            node.children.map(updateTree)
          )
          return { ...node, children: updatedChildren }
        }
        return node
      }

      if (tree) {
        const newTree = await updateTree(tree)
        setTree(newTree)
      }
    },
    [tree]
  )

  const handleSelect = (path: string) => {
    setSelectedPath(path)
    // 可扩展：打开文件预览等
  }

  const handleOpenFolder = async () => {
    try {
      const selected = await window.electronAPI.openFolderDialog()
      if (selected) {
        await loadDirectory(selected)
      }
    } catch (err) {
      console.error("打开文件夹失败:", err)
    }
  }

  const dropRef = useRef<HTMLDivElement>(null)

  // 拖拽处理
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!rootPath) return
    const files = Array.from(e.dataTransfer.files)
    // 发送到主进程处理
    for (const file of files) {
      // If your backend expects a path, you may need to use file.name and construct the full path if possible.
      // Otherwise, pass the File object or handle the upload differently.
      await window.electronAPI.moveFile(file.name, rootPath)
    }
    // 刷新目录
    loadDirectory(rootPath)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  useEffect(() => {
    if (!rootPath) return
    window.electronAPI.watchDirectory(rootPath)
    const handler = (changedPath: string) => {
      if (changedPath === rootPath) {
        loadDirectory(rootPath)
      }
    }
    window.electronAPI.onDirectoryChanged(handler)
    return () => {
      window.electronAPI.unwatchDirectory(rootPath)
      // 这里没有移除事件，因为 ipcRenderer.on 是全局的，通常不会重复注册
    }
  }, [rootPath, loadDirectory])

  // 文件移动逻辑
  const handleMove = async (src: string, dest: string) => {
    await window.electronAPI.moveFile(src, dest)
    if (rootPath) loadDirectory(rootPath)
  }

  return (
    <div
      ref={dropRef}
      className="h-full w-[320px] border-r flex flex-col bg-background"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-bold text-lg flex items-center gap-2">
          <Folder size={20} className="text-primary" />
          文件浏览器
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenFolder}
          className="flex gap-1"
        >
          <Plus size={16} />
          打开文件夹
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="border-dashed border-2 border-muted rounded mb-2 p-2 text-center text-xs text-muted-foreground">
          拖拽文件到此区域上传到当前文件夹
        </div>
        {tree ? (
          <div>
            <div className="text-xs text-muted-foreground px-2 pb-2">
              {tree.name}
            </div>
            {tree.children?.map((item) => (
              <FileNode
                key={item.path}
                node={item}
                onToggle={toggleFolder}
                onSelect={handleSelect}
                selectedPath={selectedPath}
                onMove={handleMove}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            请选择文件夹
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
