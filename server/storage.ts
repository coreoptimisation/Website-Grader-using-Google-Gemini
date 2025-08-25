import { 
  scans, 
  scanResults, 
  scanReports, 
  scanEvidence,
  type Scan, 
  type ScanResult, 
  type ScanReport,
  type ScanEvidence,
  type InsertScan, 
  type InsertScanResult, 
  type InsertScanReport,
  type User, 
  type InsertUser,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: string): Promise<Scan | undefined>;
  updateScanStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  getRecentScans(limit?: number): Promise<Scan[]>;
  
  // Scan results operations
  createScanResult(result: InsertScanResult): Promise<ScanResult>;
  getScanResults(scanId: string): Promise<ScanResult[]>;
  
  // Scan report operations
  createScanReport(report: InsertScanReport): Promise<ScanReport>;
  getScanReport(scanId: string): Promise<ScanReport | undefined>;
  
  // Evidence operations
  createScanEvidence(evidence: Omit<ScanEvidence, 'id' | 'createdAt'>): Promise<ScanEvidence>;
  getScanEvidence(scanId: string): Promise<ScanEvidence[]>;
  
  // Delete operations
  deleteScan(scanId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db
      .insert(scans)
      .values(scan)
      .returning();
    return newScan;
  }

  async getScan(id: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan || undefined;
  }

  async updateScanStatus(id: string, status: string, completedAt?: Date): Promise<void> {
    await db
      .update(scans)
      .set({ 
        status, 
        updatedAt: new Date(),
        ...(completedAt && { completedAt })
      })
      .where(eq(scans.id, id));
  }

  async getRecentScans(limit = 10): Promise<any[]> {
    const scansWithReports = await db
      .select({
        id: scans.id,
        url: scans.url,
        status: scans.status,
        createdAt: scans.createdAt,
        completedAt: scans.completedAt,
        overallScore: scanReports.overallScore,
        grade: scanReports.grade
      })
      .from(scans)
      .leftJoin(scanReports, eq(scans.id, scanReports.scanId))
      .orderBy(desc(scans.createdAt))
      .limit(limit);
    
    return scansWithReports;
  }

  async createScanResult(result: InsertScanResult): Promise<ScanResult> {
    const [newResult] = await db
      .insert(scanResults)
      .values(result)
      .returning();
    return newResult;
  }

  async getScanResults(scanId: string): Promise<ScanResult[]> {
    return db
      .select()
      .from(scanResults)
      .where(eq(scanResults.scanId, scanId));
  }

  async createScanReport(report: InsertScanReport): Promise<ScanReport> {
    const [newReport] = await db
      .insert(scanReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getScanReport(scanId: string): Promise<ScanReport | undefined> {
    const [report] = await db
      .select()
      .from(scanReports)
      .where(eq(scanReports.scanId, scanId));
    return report || undefined;
  }

  async createScanEvidence(evidence: Omit<ScanEvidence, 'id' | 'createdAt'>): Promise<ScanEvidence> {
    const [newEvidence] = await db
      .insert(scanEvidence)
      .values(evidence)
      .returning();
    return newEvidence;
  }

  async getScanEvidence(scanId: string): Promise<ScanEvidence[]> {
    return db
      .select()
      .from(scanEvidence)
      .where(eq(scanEvidence.scanId, scanId));
  }
  
  async deleteScan(scanId: string): Promise<void> {
    // Delete in order to respect foreign key constraints
    // First delete evidence
    await db
      .delete(scanEvidence)
      .where(eq(scanEvidence.scanId, scanId));
    
    // Then delete results
    await db
      .delete(scanResults)
      .where(eq(scanResults.scanId, scanId));
    
    // Then delete reports
    await db
      .delete(scanReports)
      .where(eq(scanReports.scanId, scanId));
    
    // Finally delete the scan itself
    await db
      .delete(scans)
      .where(eq(scans.id, scanId));
  }
}

export const storage = new DatabaseStorage();
