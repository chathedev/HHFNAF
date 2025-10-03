import fs from "fs"
import path from "path"

export interface ContentFile {
  [key: string]: any
}

export async function loadContent(filename: string): Promise<ContentFile> {
  try {
    const filePath = path.join(process.cwd(), "content", filename)
    const fileContent = fs.readFileSync(filePath, "utf8")
    return JSON.parse(fileContent)
  } catch (error) {
    console.error(`Error loading content from ${filename}:`, error)
    return {}
  }
}

export async function saveContent(filename: string, content: ContentFile): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), "content", filename)
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf8")
    return true
  } catch (error) {
    console.error(`Error saving content to ${filename}:`, error)
    return false
  }
}

export function getAllContentFiles(): string[] {
  try {
    const contentDir = path.join(process.cwd(), "content")
    return fs.readdirSync(contentDir).filter((file) => file.endsWith(".json"))
  } catch (error) {
    console.error("Error reading content directory:", error)
    return []
  }
}
