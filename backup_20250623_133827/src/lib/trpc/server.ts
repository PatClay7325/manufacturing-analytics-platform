/**
 * tRPC server configuration for Manufacturing Intelligence Platform
 * 
 * This file sets up the tRPC server with context, middlewares, and error handling
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { PrismaClient } from '@prisma/client';

/**
 * Context configuration
 */
export type Context = {
  prisma: PrismaClient;
  user?: {
    id: string;
    role: string;
  } | null;
};

// Initialize prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Context creator function
 * This function is called for every request and populates the context object
 */
export const createContext = async (): Promise<Context> => {
  // For now, we don't have authentication, so the user is always null
  // In the future, this would extract the user from the request
  return {
    prisma,
    user: null,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Authentication middleware
 * This middleware checks if the user is authenticated
 */
const isAuthenticated = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Authorization middleware
 * This middleware checks if the user has the required role
 */
const hasRole = (allowedRoles: string[]) =>
  t.middleware(({ next, ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User is not authenticated',
      });
    }
    
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not have permission to access this resource',
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });

/**
 * Error logging middleware
 * This middleware logs all errors
 */
const logErrors = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  
  if (result.ok) {
    console.log(`[${type}] ${path} - OK - ${durationMs}ms`);
  } else {
    console.error(`[${type}] ${path} - ERROR - ${durationMs}ms`, result.error);
  }
  
  return result;
});

/**
 * Export base procedures
 */
export const router = t.router;
export const publicProcedure = t.procedure.use(logErrors);
export const protectedProcedure = t.procedure.use(logErrors).use(isAuthenticated);
export const adminProcedure = t.procedure
  .use(logErrors)
  .use(isAuthenticated)
  .use(hasRole(['admin']));
export const managerProcedure = t.procedure
  .use(logErrors)
  .use(isAuthenticated)
  .use(hasRole(['admin', 'manager']));
export const engineerProcedure = t.procedure
  .use(logErrors)
  .use(isAuthenticated)
  .use(hasRole(['admin', 'manager', 'engineer']));

/**
 * Type helpers
 */
export type Router = ReturnType<typeof router>;