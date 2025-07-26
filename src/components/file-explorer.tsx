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
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle
}

// 声明 File System Access API 类型
declare global {
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory'
    readonly name: string
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file'
    getFile(): Promise<File>
    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory'
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>
    getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>
    getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean
  }

  interface FileSystemGetFileOptions {
    create?: boolean
  }

  interface FileSystemGetDirectoryOptions {
    create?: boolean
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>
    close(): Promise<void>
  }

  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

// 检查浏览器是否支持 File System Access API
const isFileSystemAccessSupported = () => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
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
  onSelect: (path: string, handle?: FileSystemFileHandle) => void
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
      style={{ paddingLeft: `${depth * 20}px` }}
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
            onSelect(node.path, node.handle as FileSystemFileHandle)
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
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(isFileSystemAccessSupported())
  }, [])

  // 读取目录内容
  const readDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    basePath: string = ""
  ): Promise<FileEntry[]> => {
    const entries: FileEntry[] = []
    
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const path = basePath ? `${basePath}/${name}` : name
        
        if (handle.kind === 'directory') {
          entries.push({
            name,
            path,
            isDirectory: true,
            handle: handle as FileSystemDirectoryHandle,
            children: [], // 懒加载
            expanded: false,
          })
        } else {
          entries.push({
            name,
            path,
            isDirectory: false,
            handle: handle as FileSystemFileHandle,
          })
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error)
    }
    
    // 按文件夹优先，然后按名称排序
    return entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }

  const loadDirectory = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    try {
      const entries = await readDirectory(dirHandle)
      setTree({
        name: dirHandle.name,
        path: dirHandle.name,
        isDirectory: true,
        expanded: true,
        children: entries,
        handle: dirHandle,
      })
      setRootHandle(dirHandle)
      setSelectedPath(null)
    } catch (err) {
      console.error("读取目录失败:", err)
    }
  }, [])

  const toggleFolder = useCallback(
    async (path: string) => {
      const updateTree = async (node: FileEntry): Promise<FileEntry> => {
        if (node.path === path) {
          if (node.expanded) {
            return { ...node, expanded: false }
          } else {
            let children = node.children
            if (!children || children.length === 0) {
              // 懒加载子目录
              if (node.handle && node.handle.kind === 'directory') {
                children = await readDirectory(
                  node.handle as FileSystemDirectoryHandle,
                  node.path
                )
              }
            }
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

  const handleSelect = (path: string, handle?: FileSystemFileHandle) => {
    setSelectedPath(path)
    // 可以在这里处理文件选择，例如读取文件内容
    if (handle) {
      console.log("选中文件:", path, handle)
    }
  }

  const handleOpenFolder = async () => {
    if (!isSupported) {
      alert("您的浏览器不支持 File System Access API。请使用 Chrome 86+ 或 Edge 86+")
      return
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      })
      await loadDirectory(dirHandle)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("打开文件夹失败:", err)
      }
    }
  }

  // 处理拖拽上传文件
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!rootHandle) return

    const files = Array.from(e.dataTransfer.files)
    
    try {
      for (const file of files) {
        // 创建新文件
        const fileHandle = await rootHandle.getFileHandle(file.name, {
          create: true
        })
        const writable = await fileHandle.createWritable()
        await writable.write(file)
        await writable.close()
      }
      // 刷新目录
      await loadDirectory(rootHandle)
    } catch (err) {
      console.error("上传文件失败:", err)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // 文件移动逻辑（File System Access API 中移动文件比较复杂，这里简化处理）
  const handleMove = async (src: string, dest: string) => {
    console.log("移动文件功能需要更复杂的实现", src, dest)
    // 在 File System Access API 中，移动文件需要先读取源文件，然后在目标位置创建新文件，最后删除源文件
    // 这里暂时只是一个占位符
  }

  if (!isSupported) {
    return (
      <div className="h-full w-[320px] border-r flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-bold text-lg flex items-center gap-2">
            <Folder size={20} className="text-primary" />
            文件浏览器
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">浏览器不支持文件系统访问</p>
            <p className="text-sm">请使用 Chrome 86+ 或 Edge 86+</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
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
