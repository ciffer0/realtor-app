import { Injectable, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserType } from '@prisma/client';

interface SignupParams {
    email: string;
    password: string;
    name: string;
    phone: string; 
}

interface SigninParams {
    email: string;
    password: string;
}

@Injectable()
export class AuthService {

    constructor(private readonly prismaService: PrismaService){}

    async signup({email, password, phone, name}: SignupParams, user_type: UserType){
        const userExists = await this.prismaService.user.findUnique({
            where: {
                email
            }
        })

        if(userExists){
            throw new ConflictException()
        }
        
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await this.prismaService.user.create({
            data: {
                email,
                name,
                phone,
                password: hashedPassword,
                user_type: user_type
            }
        })

        const token = await this.generateJWT(name, user.id)

        return { token };
    }

    async signin({ email, password }: SigninParams){
        const user = await this.prismaService.user.findUnique({
            where: {
                email
            }
        })

        if(!user){
            throw new HttpException("Invalid credentials", 400)
        }

        const hashedPassword = user.password
        const isValidPassword = await bcrypt.compare(password, hashedPassword)

        if(!isValidPassword){
            throw new HttpException("Invalid credentials", 400)
        }

        const token = await this.generateJWT(user.name, user.id)

        return { token };
    }

    private async generateJWT(name: string, id: number){
        return jwt.sign({
            name,
            id
        }, process.env.JSON_TOKEN_KEY, {
            expiresIn: 3600000
        })
    }

    async generateProductKey(email: string, userType: UserType){
        const txt = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`
        const key = await bcrypt.hash(txt, 10)
        return { key }
    }
}