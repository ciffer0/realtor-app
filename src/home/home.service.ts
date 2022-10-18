import { Injectable, NotFoundException } from '@nestjs/common';
import { PropretyType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfo } from 'src/user/decorators/user.decorator';
import { HomeResponseDto } from './dtos/home.dto';

interface GetHomesParam {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  proprety_type?: PropretyType;
}

interface CreateHomeParams {
    address: string;
    numberOfBedrooms: number;
    numberOfBathrooms: number;
    city: string;
    price: number;
    landSize: number;
    propretyType: PropretyType;
    images: {url: string}[];
}

interface UpdateHomeParams {
    address?: string;
    numberOfBedrooms?: number;
    numberOfBathrooms?: number;
    city?: string;
    price?: number;
    landSize?: number;
    propretyType?: PropretyType;
}

const homeSelect = {
  id: true,
  address: true,
  city: true,
  price: true,
  proprety_type: true,
  number_of_bathrooms: true,
  number_of_bedrooms: true,
};

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(filters: GetHomesParam): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: filters,
    });

    if (!homes.length) {
      throw new NotFoundException();
    }
    return homes.map((home) => {
      const fetchedHome = { ...home, image: home.images[0].url };
      delete fetchedHome.images;
      return new HomeResponseDto(fetchedHome);
    });
  }

  async getHomeById(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: {
        id,
      },
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException();
    }

    return new HomeResponseDto(home);
  }

  async createHome({address, numberOfBedrooms, numberOfBathrooms, city, landSize, price, propretyType, images}: CreateHomeParams, userId: number){
    const home = await this.prismaService.home.create({
        data: {
            address,
            number_of_bathrooms: numberOfBathrooms,
            number_of_bedrooms: numberOfBedrooms,
            city,
            land_size: landSize,
            price,
            proprety_type: propretyType,
            realtor_id: userId
        }
    })

    const homeImages = images.map(image => {
        return {...image, home_id: home.id}
    })

    await this.prismaService.image.createMany({
        data: homeImages
    })

    return new HomeResponseDto(home)
  }

  async updateHome(id: number, data: UpdateHomeParams){
    const home = await this.prismaService.home.findUnique({
        where: {
            id
        }
    })

    if(!home){
        throw new NotFoundException();
    }

    const updatedHome = await this.prismaService.home.update({
        where: {
            id,
        },
        data
    })

    return new HomeResponseDto(updatedHome)
  }

  async deleteHome(id: number){
    await this.prismaService.image.deleteMany({
        where: {
            home_id: id
        }
    })
    
    await this.prismaService.home.delete({
        where: {
            id,
        }
    })
  }

  async getRealtorByHomeId(id: number){
    const realtor = await this.prismaService.home.findUnique({
      where: {
        id
      },
      select: {
        realtor: {
          select: {
            name: true,
            id: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if(!realtor){
      throw new NotFoundException()
    }

    return realtor
  }

  async inquire(buyer: UserInfo, homeId: number, message: string){
    const realtor = await this.getRealtorByHomeId(homeId)
    const newMessage = await this.prismaService.message.create({
      data: {
        realtor_id: realtor.realtor.id,
        buyer_id: buyer.id,
        home_id: homeId,
        message
      }
    })

    return newMessage
  }

  async getMessagesByHome(homeId: number){
    return this.prismaService.message.findMany({
      where: {
        home_id: homeId
      },
      select: {
        message: true,
        buyer: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    })
  }
}
